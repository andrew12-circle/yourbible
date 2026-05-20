import type { TranscriptSegmentRow } from "./transcriptTypes.ts";

export type SemanticChunk = {
  start_seconds: number;
  end_seconds: number | null;
  text: string;
};

const TARGET_CHARS = 2400;
const MIN_CHARS = 400;
const OVERLAP_SECONDS = 45;

/** Group segments into embedding-sized chunks on speaker/paragraph boundaries. */
export function chunkTranscriptSegments(segments: TranscriptSegmentRow[]): SemanticChunk[] {
  if (!segments.length) return [];

  const sorted = [...segments].sort((a, b) => a.start_seconds - b.start_seconds);
  const chunks: SemanticChunk[] = [];
  let buf: TranscriptSegmentRow[] = [];
  let bufChars = 0;
  let lastSpeaker: string | null = null;

  const flush = (force: boolean) => {
    if (!buf.length) return;
    const text = buf.map((s) => s.text.trim()).filter(Boolean).join("\n\n");
    if (!text) {
      buf = [];
      bufChars = 0;
      return;
    }
    if (!force && text.length < MIN_CHARS && chunks.length > 0) return;

    const start = buf[0].start_seconds;
    const last = buf[buf.length - 1];
    const end = last.end_seconds ?? last.start_seconds + 30;

    if (chunks.length > 0 && OVERLAP_SECONDS > 0) {
      const prev = chunks[chunks.length - 1];
      const overlapStart = Math.max(start, (prev.end_seconds ?? start) - OVERLAP_SECONDS);
      const overlapSegs = sorted.filter(
        (s) => s.start_seconds >= overlapStart && s.start_seconds < start,
      );
      if (overlapSegs.length) {
        const prefix = overlapSegs.map((s) => s.text.trim()).join(" ");
        chunks[chunks.length - 1].text = `${chunks[chunks.length - 1].text}\n\n${prefix}`.trim();
        chunks[chunks.length - 1].end_seconds = start;
      }
    }

    chunks.push({ start_seconds: start, end_seconds: end, text: text.slice(0, 12000) });
    buf = [];
    bufChars = 0;
  };

  for (const seg of sorted) {
    const speakerChanged = seg.speaker && lastSpeaker && seg.speaker !== lastSpeaker;
    const nextLen = bufChars + seg.text.length + 2;
    if ((speakerChanged || nextLen > TARGET_CHARS) && buf.length) flush(false);
    buf.push(seg);
    bufChars += seg.text.length + 2;
    if (seg.speaker) lastSpeaker = seg.speaker;
    if (bufChars >= TARGET_CHARS) flush(true);
  }
  flush(true);
  return chunks;
}
