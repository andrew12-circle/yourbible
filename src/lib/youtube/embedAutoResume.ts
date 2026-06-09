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
