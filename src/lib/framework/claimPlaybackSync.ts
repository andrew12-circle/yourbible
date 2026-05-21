import type { TranscriptSegment } from "@/lib/transcriptSplit";

export type ClaimWithChapter = { id: string; chapter_start_seconds?: number | null };

/** Seconds to seek for a claim: transcript line time, else YouTube chapter anchor. */
export function getClaimSeekSeconds(
  claim: ClaimWithChapter,
  source: Pick<TranscriptSegment, "startSeconds"> | null | undefined,
): number | null {
  if (source?.startSeconds != null && Number.isFinite(source.startSeconds)) {
    return Math.max(0, Math.floor(source.startSeconds));
  }
  const chapter = claim.chapter_start_seconds;
  if (chapter != null && Number.isFinite(chapter)) return Math.max(0, Math.floor(chapter));
  return null;
}

/** Claim whose anchor time is latest still at or before playback (same rule as transcript lines). */
export function findActiveClaimId<T extends ClaimWithChapter>(
  claims: T[],
  seekSecondsForClaim: (claim: T) => number | null,
  playbackSeconds: number,
): string | null {
  let bestId: string | null = null;
  let bestStart = -1;
  for (const claim of claims) {
    const start = seekSecondsForClaim(claim);
    if (start == null || !Number.isFinite(start)) continue;
    if (start <= playbackSeconds && start >= bestStart) {
      bestStart = start;
      bestId = claim.id;
    }
  }
  return bestId;
}
