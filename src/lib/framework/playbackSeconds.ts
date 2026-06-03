/** Prefer live telemetry; fall back to last known position (0 is valid). */
export function resolvePlaybackSeconds(
  staticTime: number | null | undefined,
  fallback: number,
): number {
  return staticTime ?? fallback;
}

/**
 * Static YouTube iframe telemetry can stall (especially on iPad) while audio keeps
 * playing — `currentTime` stays 0 but `fallback` was persisted every 2s.
 */
export function resolveEmbedPlaybackSeconds(
  staticTime: number,
  fallback: number,
  telemetryFresh: boolean,
): number {
  if (!telemetryFresh && Number.isFinite(fallback) && fallback >= 0) return fallback;
  return staticTime;
}
