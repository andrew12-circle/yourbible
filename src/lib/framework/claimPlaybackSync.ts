import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { parseTranscriptPartNumber } from "@/lib/transcriptSplit";

export type ClaimWithChapter = { id: string; chapter_start_seconds?: number | null };

export type ClaimSeekContext = {
  transcriptSegments?: TranscriptSegment[];
  videoDurationSeconds?: number | null;
};

/** Evenly distribute untimed `Part N` rows across known video length. */
export function estimateUntimedPartSeekSeconds(
  source: Pick<TranscriptSegment, "label" | "startSeconds">,
  segments: TranscriptSegment[],
  videoDurationSeconds: number,
): number | null {
  if (source.startSeconds != null && Number.isFinite(source.startSeconds)) return null;
  const partNum = parseTranscriptPartNumber(source.label);
  if (partNum == null) return null;

  const parts = segments.filter(
    (segment) => !segment.isParagraphBreak && parseTranscriptPartNumber(segment.label) != null,
  );
  if (!parts.length) return null;

  const idx = parts.findIndex((segment) => parseTranscriptPartNumber(segment.label) === partNum);
  if (idx < 0) return null;

  const duration = Math.max(1, Math.floor(videoDurationSeconds));
  if (parts.length === 1) return 0;
  return Math.min(duration - 1, Math.floor((idx / (parts.length - 1)) * duration));
}

/** Seconds to seek for a claim: transcript time, chapter anchor, or untimed part estimate. */
export function getClaimSeekSeconds(
  claim: ClaimWithChapter,
  source: Pick<TranscriptSegment, "startSeconds" | "label"> | null | undefined,
  ctx?: ClaimSeekContext,
): number | null {
  if (source?.startSeconds != null && Number.isFinite(source.startSeconds)) {
    return Math.max(0, Math.floor(source.startSeconds));
  }
  const chapter = claim.chapter_start_seconds;
  if (chapter != null && Number.isFinite(chapter)) return Math.max(0, Math.floor(chapter));

  const duration = ctx?.videoDurationSeconds;
  const segments = ctx?.transcriptSegments;
  if (source && segments?.length && duration != null && Number.isFinite(duration) && duration > 0) {
    const estimated = estimateUntimedPartSeekSeconds(source, segments, duration);
    if (estimated != null) return estimated;
  }
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
