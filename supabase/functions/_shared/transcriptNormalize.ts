import type { TranscriptSegmentRow, TranscriptSegmentSource } from "./transcriptTypes.ts";

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Parse `[M:SS]` or `[H:MM:SS]` lines into segment rows. */
export function segmentsFromTimedText(
  rawText: string,
  source: TranscriptSegmentSource,
): TranscriptSegmentRow[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: TranscriptSegmentRow[] = [];
  let seq = 0;
  for (const line of lines) {
    const m = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$/s);
    if (!m) continue;
    const stamp = m[1];
    const text = m[2].trim();
    if (!text) continue;
    const parts = stamp.split(":").map((p) => Number.parseInt(p, 10));
    let start = 0;
    if (parts.length === 3) start = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) start = parts[0] * 60 + parts[1];
    out.push({
      seq: seq++,
      start_seconds: start,
      end_seconds: null,
      text,
      speaker: null,
      confidence: null,
      source,
    });
  }
  for (let i = 0; i < out.length; i++) {
    const next = out[i + 1];
    if (next) out[i].end_seconds = next.start_seconds;
  }
  return out;
}

export function assembleRawTextFromSegments(segments: TranscriptSegmentRow[]): string {
  return segments
    .map((s) => `[${formatTime(s.start_seconds)}] ${s.text.trim()}`)
    .join("\n")
    .trim();
}

export function speakerCountFromSegments(segments: TranscriptSegmentRow[]): number | null {
  const speakers = new Set(
    segments.map((s) => s.speaker?.trim()).filter((x): x is string => Boolean(x)),
  );
  return speakers.size > 0 ? speakers.size : null;
}

export function buildFetchResult(
  segments: TranscriptSegmentRow[],
  source: TranscriptSegmentSource,
  provider: string,
): { segments: TranscriptSegmentRow[]; rawText: string; source: TranscriptSegmentSource; provider: string; speakerCount: number | null } {
  const rawText = assembleRawTextFromSegments(segments);
  return {
    segments,
    rawText,
    source,
    provider,
    speakerCount: speakerCountFromSegments(segments),
  };
}
