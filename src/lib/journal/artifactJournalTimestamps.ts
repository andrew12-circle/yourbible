import { formatJournalPlaybackTimestamp } from "@/lib/journal/floatingJournalDraft";
import {
  collectTranscriptTextOverlappingInclusiveRange,
  type TranscriptSegment,
} from "@/lib/transcriptSplit";

export const JOURNAL_TS_MARKER_PREFIX = "<!-- yb-journal-ts:";

export type JournalTimestampMarker = {
  /** Stable key (seconds). */
  id: string;
  seconds: number;
  clock: string;
  transcriptLines: string[];
};

const BLOCK_RE =
  /<!-- yb-journal-ts:(\d+) -->\s*\n@?\s*([^\n]+)(?:\n+((?:>[^\n]*\n?)+))?/g;

const LEGACY_STAMP_RE = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*$/gm;

/** Parse `m:ss` or `h:mm:ss` from journal stamps. */
export function parseJournalPlaybackClock(clock: string): number | null {
  const trimmed = clock.trim().replace(/^@?\s*/, "").replace(/^\[|\]$/g, "");
  const parts = trimmed.split(":").map((p) => Number.parseInt(p, 10));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function parseBlockquoteLines(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split("\n")
    .map((line) => line.replace(/^>\s?/, "").trim())
    .filter(Boolean);
}

/** Timed lines around the playhead for journal timestamp blocks. */
export function buildTranscriptContextAt(
  segments: TranscriptSegment[],
  seconds: number,
  beforeSec = 10,
  afterSec = 18,
): string[] {
  const t = Math.max(0, Math.floor(seconds));
  const lines = collectTranscriptTextOverlappingInclusiveRange(
    segments,
    Math.max(0, t - beforeSec),
    t + afterSec,
  );
  if (lines.length) return lines;
  const active = segments
    .filter((s) => !s.isParagraphBreak && s.startSeconds != null && s.startSeconds <= t)
    .sort((a, b) => (b.startSeconds ?? 0) - (a.startSeconds ?? 0))[0];
  const text = active?.text?.trim();
  return text ? [text] : [];
}

export function formatJournalTimestampBlock(seconds: number, transcriptLines: string[]): string {
  const t = Math.max(0, Math.floor(seconds));
  const clock = formatJournalPlaybackTimestamp(t);
  const lines = [`${JOURNAL_TS_MARKER_PREFIX}${t} -->`, `@ ${clock}`, ""];
  if (transcriptLines.length) {
    for (const line of transcriptLines) lines.push(`> ${line}`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

export function appendJournalTimestampToNotes(notes: string, block: string): string {
  const trimmed = notes.trimEnd();
  if (!trimmed) return block;
  return `${trimmed}\n\n${block}`;
}

/** Full stored timestamp blocks (HTML comment + clock + transcript quotes). */
export function extractJournalTimestampBlocks(notes: string): string[] {
  const blocks: string[] = [];
  const re = new RegExp(BLOCK_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(notes)) !== null) {
    blocks.push(m[0].trimEnd());
  }
  return blocks;
}

/** User-facing notes only — timestamp blocks live in the mark strip, not the editor. */
export function stripJournalTimestampBlocks(notes: string): string {
  let out = notes.replace(new RegExp(BLOCK_RE.source, "g"), "");
  out = out.replace(new RegExp(LEGACY_STAMP_RE.source, "gm"), "");
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function composeJournalNotesWithTimestampBlocks(userNotes: string, blocks: string[]): string {
  const user = userNotes.trimEnd();
  const ts = blocks.map((b) => b.trim()).filter(Boolean).join("\n\n");
  if (!ts) return user;
  if (!user.trim()) return ts;
  return `${ts}\n\n${user}`;
}

export function parseJournalTimestampMarkers(notes: string): JournalTimestampMarker[] {
  const bySeconds = new Map<number, JournalTimestampMarker>();

  let m: RegExpExecArray | null;
  const blockRe = new RegExp(BLOCK_RE.source, "g");
  while ((m = blockRe.exec(notes)) !== null) {
    const seconds = Number.parseInt(m[1], 10);
    if (!Number.isFinite(seconds)) continue;
    const clockRaw = m[2]?.trim() || formatJournalPlaybackTimestamp(seconds);
    const clock = clockRaw.replace(/^@?\s*/, "");
    bySeconds.set(seconds, {
      id: String(seconds),
      seconds,
      clock,
      transcriptLines: parseBlockquoteLines(m[3]),
    });
  }

  const legacyRe = new RegExp(LEGACY_STAMP_RE.source, "gm");
  while ((m = legacyRe.exec(notes)) !== null) {
    const parsed = parseJournalPlaybackClock(m[1]);
    if (parsed == null || bySeconds.has(parsed)) continue;
    bySeconds.set(parsed, {
      id: String(parsed),
      seconds: parsed,
      clock: m[1],
      transcriptLines: [],
    });
  }

  return [...bySeconds.values()].sort((a, b) => a.seconds - b.seconds);
}

export function buildJournalTimestampInsert(
  seconds: number,
  segments?: TranscriptSegment[],
): string {
  const lines =
    segments?.length ? buildTranscriptContextAt(segments, seconds) : [];
  return formatJournalTimestampBlock(seconds, lines);
}
