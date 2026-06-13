type CaptionSegment = { text?: string; offset?: number; duration?: number; start?: number };

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

function segmentOffset(seg: CaptionSegment): number {
  if (typeof seg.offset === "number") return Math.max(0, seg.offset);
  if (typeof seg.start === "number") return Math.max(0, seg.start);
  return 0;
}

/** Merge short YouTube caption cues into thicker, YouTube-like lines. */
export function mergeCaptionSegments<T extends CaptionSegment>(segments: T[]): T[] {
  const cleaned = segments
    .map((seg) => ({
      seg,
      text: cleanSegmentText(seg.text ?? ""),
      offset: segmentOffset(seg),
      duration: typeof seg.duration === "number" && seg.duration > 0 ? seg.duration : 0,
    }))
    .filter((row) => row.text);

  if (!cleaned.length) return [];

  const merged: T[] = [];
  let buf = cleaned[0]!;
  let bufEnd = buf.offset + buf.duration;

  for (let i = 1; i < cleaned.length; i++) {
    const row = cleaned[i]!;
    const combined = `${buf.text} ${row.text}`.replace(/\s+/g, " ").trim();
    const words = wordCount(combined);
    const span = row.offset + row.duration - buf.offset;
    const gap = row.offset - bufEnd;
    const shouldFlush =
      words >= TARGET_MAX_WORDS ||
      span >= MAX_SPAN_SECONDS ||
      gap > MAX_GAP_SECONDS ||
      (wordCount(buf.text) >= TARGET_MIN_WORDS && endsSentence(buf.text));

    if (shouldFlush) {
      merged.push({
        ...buf.seg,
        text: buf.text,
        offset: buf.offset,
        start: buf.offset,
        duration: Math.max(0, bufEnd - buf.offset),
      });
      buf = row;
      bufEnd = row.offset + row.duration;
      continue;
    }

    buf = {
      seg: buf.seg,
      text: combined,
      offset: buf.offset,
      duration: row.offset + row.duration - buf.offset,
    };
    bufEnd = row.offset + row.duration;
  }

  merged.push({
    ...buf.seg,
    text: buf.text,
    offset: buf.offset,
    start: buf.offset,
    duration: Math.max(0, bufEnd - buf.offset),
  });
  return merged;
}
