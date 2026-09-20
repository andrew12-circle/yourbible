import type { TranscriptSegment } from "@/lib/transcriptSplit";

export type ClaimWithChapter = { id: string; chapter_start_seconds?: number | null; source_evidence?: unknown };
export type ClaimSeekContext = { transcriptSegments?: TranscriptSegment[]; videoDurationSeconds?: number | null };
/** Deprecated compatibility export: paragraph position is not evidence of audio timing. */
export function estimateUntimedPartSeekSeconds(
  _source: Pick<TranscriptSegment, "label" | "startSeconds">,
  _segments: TranscriptSegment[],
  _videoDurationSeconds: number,
): number | null {
  return null;
}
/** Exact source time, or a legacy chapter navigation anchor. Never interpolate an untimed paragraph. */
export function getClaimSeekSeconds(
  claim: ClaimWithChapter,
  source: Pick<TranscriptSegment, "startSeconds"> & Partial<Pick<TranscriptSegment, "label" | "timestampEstimated">> | null | undefined,
  _ctx?: ClaimSeekContext,
): number | null {
  if (source?.timestampEstimated) return null;
  if (source?.startSeconds != null && Number.isFinite(source.startSeconds)) return Math.max(0, Math.floor(source.startSeconds));
  // A versioned finding whose quote no longer matches must not fall back to unrelated legacy timing.
  if (claim.source_evidence) return null;
  const chapter = claim.chapter_start_seconds;
  if (chapter != null && Number.isFinite(chapter)) return Math.max(0, Math.floor(chapter));
  return null;
}
export function findActiveClaimId<T extends ClaimWithChapter>(
  claims: T[], seekSecondsForClaim: (claim: T) => number | null, playbackSeconds: number,
): string | null {
  let bestId: string | null = null;
  let bestStart = -1;
  for (const claim of claims) {
    const start = seekSecondsForClaim(claim);
    if (start == null || !Number.isFinite(start)) continue;
    if (start <= playbackSeconds && start >= bestStart) { bestStart = start; bestId = claim.id; }
  }
  return bestId;
}
