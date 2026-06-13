/** Format youtube-transcript-plus segments into thicker `[M:SS] text` lines. */

export type TranscriptPlusSegment = { text?: string; offset?: number; duration?: number };

const TARGET_MIN_WORDS = 12;
const TARGET_MAX_WORDS = 20;
const MAX_SPAN_SECONDS = 14;
const MAX_GAP_SECONDS = 1.5;

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function endsSentence(text: string): boolean {
  return /[.!?]["']?\s*$/.test(text.trim());
}

function decodeTranscriptText(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanSegmentText(text: string): string {
  return decodeTranscriptText(text.replace(/\s+/g, " ").trim());
}

/** Merge short YouTube caption cues into thicker, YouTube-like lines. */
export function mergeTranscriptPlusSegments(segments: TranscriptPlusSegment[]): TranscriptPlusSegment[] {
  const cleaned = segments
    .map((seg) => ({
      text: cleanSegmentText(seg.text ?? ""),
      offset: Math.max(0, seg.offset ?? 0),
      duration: typeof seg.duration === "number" && seg.duration > 0 ? seg.duration : 0,
    }))
    .filter((seg) => seg.text);

  if (!cleaned.length) return [];

  const merged: TranscriptPlusSegment[] = [];
  let buf = cleaned[0]!;
  let bufEnd = buf.offset + buf.duration;

  for (let i = 1; i < cleaned.length; i++) {
    const seg = cleaned[i]!;
    const combined = `${buf.text} ${seg.text}`.replace(/\s+/g, " ").trim();
    const words = wordCount(combined);
    const span = seg.offset + seg.duration - buf.offset;
    const gap = seg.offset - bufEnd;
    const shouldFlush =
      words >= TARGET_MAX_WORDS ||
      span >= MAX_SPAN_SECONDS ||
      gap > MAX_GAP_SECONDS ||
      (wordCount(buf.text) >= TARGET_MIN_WORDS && endsSentence(buf.text));

    if (shouldFlush) {
      merged.push({ text: buf.text, offset: buf.offset, duration: Math.max(0, bufEnd - buf.offset) });
      buf = seg;
      bufEnd = seg.offset + seg.duration;
      continue;
    }

    buf = { text: combined, offset: buf.offset, duration: seg.offset + seg.duration - buf.offset };
    bufEnd = seg.offset + seg.duration;
  }

  merged.push({ text: buf.text, offset: buf.offset, duration: Math.max(0, bufEnd - buf.offset) });
  return merged;
}

export function transcriptPlusToTimedText(segments: TranscriptPlusSegment[]): string | null {
  const lines: string[] = [];
  for (const seg of mergeTranscriptPlusSegments(segments)) {
    const text = seg.text ?? "";
    if (!text) continue;
    const startSeconds = Math.max(0, Math.floor(seg.offset ?? 0));
    const h = Math.floor(startSeconds / 3600);
    const m = Math.floor((startSeconds % 3600) / 60);
    const s = Math.floor(startSeconds % 60);
    const stamp = h
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
    lines.push(`[${stamp}] ${text}`);
  }
  return lines.join("\n").trim() || null;
}
