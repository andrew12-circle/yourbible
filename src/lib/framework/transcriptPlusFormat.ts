/** Format youtube-transcript-plus segments into `[M:SS] text` lines. */

export type TranscriptPlusSegment = { text?: string; offset?: number };

export function transcriptPlusToTimedText(segments: TranscriptPlusSegment[]): string | null {
  const lines: string[] = [];
  for (const seg of segments) {
    const text = (seg.text ?? "").replace(/\s+/g, " ").trim();
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
