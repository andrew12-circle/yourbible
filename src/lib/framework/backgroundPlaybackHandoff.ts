/** Last confirmed position before a tab is hidden; elapsed time is not evidence of playback. */
export type BackgroundPlaybackHandoff = { hiddenAtMs: number; secondsAtHide: number; wasPlaying: boolean };
const HANDOFF_SS_PREFIX = "yb_artifact_playback_handoff_v1:";
const handoffSessionKey = (artifactId: string) => `${HANDOFF_SS_PREFIX}${artifactId}`;
/** Legacy name retained for callers. The snapshot is frozen until the player confirms a new time. */
export function extrapolateBackgroundPlaybackSeconds(handoff: BackgroundPlaybackHandoff, _nowMs = Date.now()): number {
  return Number.isFinite(handoff.secondsAtHide) ? Math.max(0, Math.floor(handoff.secondsAtHide)) : 0;
}
export function readBackgroundPlaybackHandoff(artifactId: string): BackgroundPlaybackHandoff | null {
  try {
    const raw = sessionStorage.getItem(handoffSessionKey(artifactId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BackgroundPlaybackHandoff>;
    if (typeof parsed.hiddenAtMs !== "number" || !Number.isFinite(parsed.hiddenAtMs) ||
      typeof parsed.secondsAtHide !== "number" || !Number.isFinite(parsed.secondsAtHide) ||
      typeof parsed.wasPlaying !== "boolean") return null;
    return { hiddenAtMs: parsed.hiddenAtMs, secondsAtHide: Math.max(0, Math.floor(parsed.secondsAtHide)), wasPlaying: parsed.wasPlaying };
  } catch { return null; }
}
export function writeBackgroundPlaybackHandoff(artifactId: string, handoff: BackgroundPlaybackHandoff): void {
  try { sessionStorage.setItem(handoffSessionKey(artifactId), JSON.stringify({ ...handoff, secondsAtHide: extrapolateBackgroundPlaybackSeconds(handoff) })); }
  catch { /* Optional recovery snapshot. */ }
}
export function clearBackgroundPlaybackHandoff(artifactId: string): void {
  try { sessionStorage.removeItem(handoffSessionKey(artifactId)); } catch { /* Optional recovery snapshot. */ }
}
/** A current saved position, including zero or a rewind, takes precedence over an older hide snapshot. */
export function mergePlaybackWithBackgroundHandoff(savedSeconds: number, artifactId: string | undefined, _nowMs = Date.now()): number {
  if (Number.isFinite(savedSeconds) && savedSeconds >= 0) return Math.floor(savedSeconds);
  const handoff = artifactId ? readBackgroundPlaybackHandoff(artifactId) : null;
  return handoff ? extrapolateBackgroundPlaybackSeconds(handoff) : 0;
}
