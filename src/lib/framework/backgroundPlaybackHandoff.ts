/** Last verified position while hidden. Wall-clock time is not playback evidence. */
export type BackgroundPlaybackHandoff = { hiddenAtMs: number; secondsAtHide: number; wasPlaying: boolean };
const HANDOFF_SS_PREFIX = "yb_artifact_playback_handoff_v1:";
function handoffSessionKey(artifactId: string) { return `${HANDOFF_SS_PREFIX}${artifactId}`; }
export function extrapolateBackgroundPlaybackSeconds(handoff: BackgroundPlaybackHandoff, _nowMs = Date.now()): number {
  return Math.max(0, Math.floor(handoff.secondsAtHide));
}
export function readBackgroundPlaybackHandoff(artifactId: string): BackgroundPlaybackHandoff | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(handoffSessionKey(artifactId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BackgroundPlaybackHandoff>;
    if (typeof parsed.hiddenAtMs !== "number" || typeof parsed.secondsAtHide !== "number" ||
      typeof parsed.wasPlaying !== "boolean" || !Number.isFinite(parsed.hiddenAtMs) || !Number.isFinite(parsed.secondsAtHide)) return null;
    return { hiddenAtMs: parsed.hiddenAtMs, secondsAtHide: Math.max(0, Math.floor(parsed.secondsAtHide)), wasPlaying: parsed.wasPlaying };
  } catch { return null; }
}
export function writeBackgroundPlaybackHandoff(artifactId: string, handoff: BackgroundPlaybackHandoff): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(handoffSessionKey(artifactId), JSON.stringify({ hiddenAtMs: handoff.hiddenAtMs,
      secondsAtHide: Math.max(0, Math.floor(handoff.secondsAtHide)), wasPlaying: handoff.wasPlaying }));
  } catch { /* Storage is optional. */ }
}
export function clearBackgroundPlaybackHandoff(artifactId: string): void {
  if (typeof sessionStorage === "undefined") return;
  try { sessionStorage.removeItem(handoffSessionKey(artifactId)); } catch { /* Storage is optional. */ }
}
/** Prefer the last saved position, including intentional rewinds, over old handoffs. */
export function mergePlaybackWithBackgroundHandoff(savedSeconds: number, artifactId: string | undefined, _nowMs = Date.now()): number {
  if (Number.isFinite(savedSeconds) && savedSeconds >= 0) return Math.floor(savedSeconds);
  const handoff = artifactId ? readBackgroundPlaybackHandoff(artifactId) : null;
  return handoff ? extrapolateBackgroundPlaybackSeconds(handoff) : 0;
}
