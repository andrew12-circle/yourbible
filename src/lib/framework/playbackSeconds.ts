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

/** Seconds live may lag saved before we treat the embed as desynced. */
export const EMBED_RESUME_SEEK_DRIFT_SEC = 4;

/**
 * After tab/app background, only seek when the iframe likely lost position.
 * Never seek when live is at/ ahead of saved — avoids jumping backward after
 * background playback (telemetry often stalls at the pre-hide time on iOS).
 */
export function embedNeedsResumeSeek(
  liveSeconds: number,
  savedSeconds: number,
  telemetryFresh: boolean,
  wasPlayingWhileHidden: boolean,
): boolean {
  if (savedSeconds <= 0) return false;
  const live = Number.isFinite(liveSeconds) ? Math.max(0, liveSeconds) : 0;
  const saved = Math.max(0, savedSeconds);

  if (live >= saved - 1) return false;

  // Large drift or iframe reset after iOS app suspend — seek even if we were playing.
  if (saved - live > EMBED_RESUME_SEEK_DRIFT_SEC) return true;

  if (live < 2 && saved >= 10) return true;

  // Small drift + stale telemetry: video may have advanced without iframe updates.
  if (wasPlayingWhileHidden && !telemetryFresh) return false;

  return false;
}
