import { formatDictationForJournal } from "@/lib/ai/formatDictatedTextLocally";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import type { JournalVideoRow } from "@/lib/journal/videos";

export type JournalBodySegment =
  | { kind: "text"; start: number; end: number }
  | { kind: "video"; video: JournalVideoRow };

/** Split body text around inline videos at their anchor offsets. */
export function buildJournalBodySegments(body: string, videos: JournalVideoRow[]): JournalBodySegment[] {
  const sorted = [...videos].sort((a, b) => {
    const ao = a.anchor_offset ?? 0;
    const bo = b.anchor_offset ?? 0;
    if (ao !== bo) return ao - bo;
    return a.created_at.localeCompare(b.created_at);
  });
  const segments: JournalBodySegment[] = [];
  let cursor = 0;
  for (const video of sorted) {
    const anchor = effectiveVideoAnchor(body, video.anchor_offset);
    if (anchor > cursor) {
      segments.push({ kind: "text", start: cursor, end: anchor });
    }
    segments.push({ kind: "video", video });
    cursor = anchor;
  }
  if (cursor < body.length) {
    segments.push({ kind: "text", start: cursor, end: body.length });
  } else if (!segments.length) {
    segments.push({ kind: "text", start: 0, end: body.length });
  }
  return segments;
}

/** Collapse live caption whitespace — keeps the journal body as one flowing paragraph. */
export function normalizeLiveVideoTranscript(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Append a finalized speech chunk without replay duplicates from mic restarts. */
export function appendVideoSpeechFinal(
  current: string,
  chunk: string,
  lastFinal?: { text: string; at: number },
  now = Date.now(),
): { text: string; lastFinal: { text: string; at: number } } {
  const addition = chunk.trim();
  if (!addition) return { text: current, lastFinal: lastFinal ?? { text: "", at: 0 } };
  if (lastFinal && addition === lastFinal.text && now - lastFinal.at < 1500) {
    return { text: current, lastFinal };
  }
  const base = current.trimEnd();
  const next = !base ? `${addition} ` : `${mergeDictatedText(base, addition)} `;
  return { text: next, lastFinal: { text: addition, at: now } };
}

/** Combine finalized speech chunks with the current partial phrase (live captions). */
export function composeVideoLiveTranscript(finalized: string, interimPartial: string): string {
  const f = finalized.trimEnd();
  const interim = normalizeLiveVideoTranscript(interimPartial);
  if (!interim) return f;
  if (!f) return interim;

  const fWords = f.split(/\s+/);
  const iWords = interim.split(/\s+/);
  let overlap = 0;
  for (let n = Math.min(fWords.length, iWords.length); n > 0; n -= 1) {
    const tail = fWords.slice(-n).join(" ").toLowerCase();
    const head = iWords.slice(0, n).join(" ").toLowerCase();
    if (tail === head) {
      overlap = n;
      break;
    }
  }
  const uniqueInterim = iWords.slice(overlap).join(" ");
  if (!uniqueInterim) return f;
  return mergeDictatedText(f, uniqueInterim);
}

/** One-line overlay: most recent words only (keeps the camera visible). */
export function liveTranscriptTickerLine(text: string, maxChars = 96): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxChars) return normalized;
  return `…${normalized.slice(-(maxChars - 1))}`;
}

/** Preview journal body while recording — always from the snapshot taken at record start. */
export function bodyWithLiveVideoTranscript(
  baseBody: string,
  anchorOffset: number,
  liveTranscript: string,
): string {
  const t = normalizeLiveVideoTranscript(liveTranscript);
  if (!t) return baseBody;
  return insertTranscriptAtAnchor(baseBody, anchorOffset, t);
}

/** Clean up raw speech-to-text before inserting into the journal body. */
export function prepareVideoJournalTranscript(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return formatDictationForJournal(trimmed);
}

/** Insert spoken transcript at the anchor where video recording started. */
export function insertTranscriptAtAnchor(body: string, anchorOffset: number, transcript: string): string {
  const t = transcript.trim();
  if (!t) return body;
  const safeAnchor = Math.max(0, Math.min(anchorOffset, body.length));
  const before = body.slice(0, safeAnchor).trimEnd();
  const after = body.slice(safeAnchor).trimStart();
  if (!before) return after ? `${t}\n\n${after}` : t;
  if (!after) return `${before}\n\n${t}`;
  return `${before}\n\n${t}\n\n${after}`;
}

export function clampAnchorOffset(body: string, offset: number): number {
  return Math.max(0, Math.min(offset, body.length));
}

/** Detect mistaken toolbar-click anchors that split a word (e.g. "finally a|ble"). */
export function isLikelyMisplacedVideoAnchor(body: string, anchor: number): boolean {
  if (!body.trim()) return false;
  if (anchor <= 0) return true;
  if (anchor >= body.length) return false;
  const before = body[anchor - 1];
  const after = body[anchor];
  return Boolean(before && after && /\w/.test(before) && /\w/.test(after));
}

/** Anchor used when rendering inline video — repairs legacy bad anchors in the UI. */
export function effectiveVideoAnchor(body: string, anchorOffset: number | null | undefined): number {
  const raw = anchorOffset ?? 0;
  const clamped = clampAnchorOffset(body, raw);
  if (isLikelyMisplacedVideoAnchor(body, clamped)) return body.length;
  return clamped;
}

export type VideoAnchorOptions = {
  /** Caret index in the full body string when the editor is focused. */
  caret?: number | null;
  /** True when a body textarea currently has focus (caret is meaningful). */
  bodyEditorFocused?: boolean;
};

/**
 * Replace the spoken transcript block that sits before an inline video.
 * Common layout: transcript text, then the video at the end of the body.
 */
export function replaceTranscriptBeforeVideo(
  body: string,
  anchorOffset: number | null | undefined,
  newTranscript: string,
): string {
  const prepared = prepareVideoJournalTranscript(newTranscript) || newTranscript.trim();
  if (!prepared) return body;

  const anchor = effectiveVideoAnchor(body, anchorOffset);
  const trailing = body.slice(anchor).trimStart();
  if (!trailing) return prepared;
  return `${prepared}\n\n${trailing}`;
}

/** Pick where an inline video belongs: at the caret while editing, otherwise after existing text. */
export function resolveVideoAnchorOffset(body: string, options: VideoAnchorOptions = {}): number {
  const len = body.length;
  const { caret, bodyEditorFocused } = options;

  if (bodyEditorFocused && caret != null) {
    // Caret at start with content usually means an unset selection (dictation, loaded entry), not "insert at top".
    if (caret === 0 && body.trim().length > 0) return len;
    return clampAnchorOffset(body, caret);
  }

  return len;
}
