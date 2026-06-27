import { fixWebmDuration } from "@fix-webm-duration/fix";
import { JOURNAL_VIDEO_TARGET_BITS_PER_SECOND } from "@/lib/journal/journalVideoLimits";

/** Rough duration from file size when WebM metadata is missing or wrong. */
export function estimateJournalVideoDurationMs(blobBytes: number): number | null {
  if (blobBytes <= 0) return null;
  return Math.round((blobBytes * 8 * 1000) / JOURNAL_VIDEO_TARGET_BITS_PER_SECOND);
}

/** True when browser-reported duration disagrees with our recorded length (broken WebM metadata). */
export function journalVideoDurationNeedsFix(
  video: Pick<HTMLVideoElement, "duration">,
  durationMs: number | null | undefined,
  mimeType?: string | null,
  blobBytes?: number | null,
): boolean {
  if (mimeType && !mimeType.includes("webm")) return false;

  const reported = video.duration;
  const expectedMs =
    durationMs != null && durationMs > 0
      ? durationMs
      : blobBytes != null
        ? estimateJournalVideoDurationMs(blobBytes)
        : null;
  if (expectedMs == null || expectedMs <= 0) return false;

  const expectedSec = expectedMs / 1000;
  if (!Number.isFinite(reported) || reported <= 0) return true;
  if (reported < expectedSec * 0.85) return true;
  return false;
}

/** Patch MediaRecorder WebM blobs so players can seek across the full clip. */
export async function fixJournalVideoBlob(blob: Blob, durationMs: number): Promise<Blob> {
  const type = blob.type || "";
  if (!type.includes("webm")) return blob;
  if (!durationMs || durationMs <= 0) return blob;

  try {
    return await fixWebmDuration(blob, durationMs, { logger: false });
  } catch (e) {
    console.warn("[journal-video] fixWebmDuration failed:", e);
    return blob;
  }
}
