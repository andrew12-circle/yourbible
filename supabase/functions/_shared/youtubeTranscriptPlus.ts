/**
 * YouTube captions via youtube-transcript-plus (Innertube path, no API key).
 * Works from many IPs where raw timedtext scraping fails.
 */

import { fetchTranscript } from "npm:youtube-transcript-plus@1.1.2";

type TranscriptSegment = { text?: string; offset?: number };

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function transcriptPlusToTimedText(segments: TranscriptSegment[]): string | null {
  const lines: string[] = [];
  for (const seg of segments) {
    const text = (seg.text ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const startSeconds = Math.max(0, Math.floor(seg.offset ?? 0));
    lines.push(`[${formatTime(startSeconds)}] ${text}`);
  }
  return lines.join("\n").trim() || null;
}

export async function fetchTranscriptPlusCaptions(videoId: string): Promise<string | null> {
  if (!videoId.trim()) return null;
  try {
    const segments = await fetchTranscript(videoId, { lang: "en" });
    return transcriptPlusToTimedText(segments);
  } catch (e) {
    throw new Error(String((e as Error).message ?? e));
  }
}
