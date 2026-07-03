/** Session snapshot while a tab is hidden — extrapolates position when iframe telemetry stalls. */
export type BackgroundPlaybackHandoff = {
  hiddenAtMs: number;
  secondsAtHide: number;
  wasPlaying: boolean;
};

const HANDOFF_SS_PREFIX = "yb_artifact_playback_handoff_v1:";

function handoffSessionKey(artifactId: string) {
  return `${HANDOFF_SS_PREFIX}${artifactId}`;
}

export function extrapolateBackgroundPlaybackSeconds(
  handoff: BackgroundPlaybackHandoff,
  nowMs = Date.now(),
): number {
  if (!handoff.wasPlaying) return Math.max(0, Math.floor(handoff.secondsAtHide));
  const elapsedSec = Math.max(0, (nowMs - handoff.hiddenAtMs) / 1000);
  return Math.max(0, Math.floor(handoff.secondsAtHide + elapsedSec));
}

export function readBackgroundPlaybackHandoff(
  artifactId: string,
): BackgroundPlaybackHandoff | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(handoffSessionKey(artifactId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BackgroundPlaybackHandoff>;
    if (
      typeof parsed.hiddenAtMs !== "number" ||
      typeof parsed.secondsAtHide !== "number" ||
      typeof parsed.wasPlaying !== "boolean" ||
      !Number.isFinite(parsed.hiddenAtMs) ||
      !Number.isFinite(parsed.secondsAtHide)
    ) {
      return null;
    }
    return {
      hiddenAtMs: parsed.hiddenAtMs,
      secondsAtHide: Math.max(0, Math.floor(parsed.secondsAtHide)),
      wasPlaying: parsed.wasPlaying,
    };
  } catch {
    return null;
  }
}

export function writeBackgroundPlaybackHandoff(
  artifactId: string,
  handoff: BackgroundPlaybackHandoff,
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      handoffSessionKey(artifactId),
      JSON.stringify({
        hiddenAtMs: handoff.hiddenAtMs,
        secondsAtHide: Math.max(0, Math.floor(handoff.secondsAtHide)),
        wasPlaying: handoff.wasPlaying,
      }),
    );
  } catch {
    /* ignore */
  }
}

export function clearBackgroundPlaybackHandoff(artifactId: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(handoffSessionKey(artifactId));
  } catch {
    /* ignore */
  }
}

/** Merge saved progress with a hidden-tab extrapolation (e.g. after Chrome tab discard). */
export function mergePlaybackWithBackgroundHandoff(
  savedSeconds: number,
  artifactId: string | undefined,
  nowMs = Date.now(),
): number {
  if (!artifactId) return Math.max(0, Math.floor(savedSeconds));
  const handoff = readBackgroundPlaybackHandoff(artifactId);
  if (!handoff) return Math.max(0, Math.floor(savedSeconds));
  return Math.max(Math.max(0, Math.floor(savedSeconds)), extrapolateBackgroundPlaybackSeconds(handoff, nowMs));
}
