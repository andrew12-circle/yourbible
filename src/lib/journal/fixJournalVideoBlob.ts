import { fixWebmDuration } from "@fix-webm-duration/fix";

/** True when browser-reported duration disagrees with our recorded length (broken WebM metadata). */
export function journalVideoDurationNeedsFix(
  video: Pick<HTMLVideoElement, "duration">,
  durationMs: number | null | undefined,
  mimeType?: string | null,
): boolean {
  if (mimeType && !mimeType.includes("webm")) return false;
  if (durationMs == null || durationMs <= 0) return false;

  const expectedSec = durationMs / 1000;
  const reported = video.duration;
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
