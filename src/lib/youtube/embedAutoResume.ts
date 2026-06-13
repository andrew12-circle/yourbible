import { isIosWebKit } from "@/lib/youtube/platform";

/** Min gap between unsolicited playVideo resume commands (desktop / Android). */
export const EMBED_AUTO_RESUME_MIN_GAP_MS = 8000;

/** iOS iframe playerState is noisy — longer gap avoids reload-like stutter. */
export const EMBED_AUTO_RESUME_MIN_GAP_IOS_MS = 15000;

export function embedAutoResumeMinGapMs(): number {
  return isIosWebKit() ? EMBED_AUTO_RESUME_MIN_GAP_IOS_MS : EMBED_AUTO_RESUME_MIN_GAP_MS;
}

export function canSendEmbedAutoResume(lastSentAt: number, now = Date.now()): boolean {
  if (lastSentAt <= 0) return true;
  return now - lastSentAt >= embedAutoResumeMinGapMs();
}

/** Periodic keepalive resume — disabled on iOS; visibility handlers cover tab return. */
export function shouldUseEmbedAutoResumeKeepalive(): boolean {
  return !isIosWebKit();
}

/** How long after pointerdown on the player shell we treat PAUSE as user-initiated. */
export const EMBED_PLAYER_POINTER_INTENT_MS = 1500;

const APP_PAUSE_GRACE_MS = 500;

/** Whether an embed PAUSED event should trigger auto-resume (scroll/PiP stall), not user pause. */
export function shouldAutoResumeAfterEmbedPause(options: {
  intendedPlaying: boolean;
  msSinceAppPause: number;
  recentPlayerPointer: boolean;
  documentHidden?: boolean;
}): boolean {
  if (!options.intendedPlaying || options.documentHidden) return false;
  if (options.msSinceAppPause < APP_PAUSE_GRACE_MS) return false;
  if (options.recentPlayerPointer) return false;
  return true;
}
