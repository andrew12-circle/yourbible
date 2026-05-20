/** Parse YouTube Data API `contentDetails.duration` (ISO 8601, e.g. PT2H51M36S). */
export function parseIso8601Duration(iso: string): number | null {
  const m = iso.trim().match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return null;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  const total = h * 3600 + min * 60 + s;
  return total > 0 ? total : null;
}

export type GeminiTranscribeSegment = { start: number; end: number };

export type GeminiTranscribePlan = {
  totalSeconds: number;
  durationKnown: boolean;
  segments: GeminiTranscribeSegment[];
};

/** Plans Gemini YouTube transcription windows (always uses explicit start/end for each segment). */
export function planGeminiTranscribeSegments(
  durationSeconds: number | undefined | null,
  opts: {
    maxSingleRequestSeconds: number;
    maxDurationSeconds: number;
    segmentSeconds: number;
  },
): GeminiTranscribePlan {
  const durationKnown = typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0;
  const totalSeconds = Math.min(
    durationKnown ? Math.floor(durationSeconds) : opts.maxDurationSeconds,
    opts.maxDurationSeconds,
  );
  const useChunked = !durationKnown || totalSeconds > opts.maxSingleRequestSeconds;

  if (!useChunked) {
    return {
      totalSeconds,
      durationKnown: true,
      segments: [{ start: 0, end: totalSeconds }],
    };
  }

  const segments: GeminiTranscribeSegment[] = [];
  for (let start = 0; start < totalSeconds; start += opts.segmentSeconds) {
    segments.push({ start, end: Math.min(start + opts.segmentSeconds, totalSeconds) });
  }
  return { totalSeconds, durationKnown, segments };
}
