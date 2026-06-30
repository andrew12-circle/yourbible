/** Target max journal clip length (continuous record, pause/resume supported). */
export const JOURNAL_VIDEO_MAX_DURATION_MS = 30 * 60 * 1000;

/** Supabase free-tier global upload cap; keep a little headroom for metadata. */
export const JOURNAL_VIDEO_MAX_UPLOAD_BYTES = 48 * 1024 * 1024;

/** Stop recording slightly before the hard upload cap (Safari often overshoots bitrate). */
export const JOURNAL_VIDEO_RECORD_STOP_BYTES = 46 * 1024 * 1024;

/** Target total bitrate when the browser honors MediaRecorder limits. */
export const JOURNAL_VIDEO_TARGET_BITS_PER_SECOND = 212_000;

/** Bitrates chosen so ~30 min camera journal fits under the upload cap. */
export const JOURNAL_VIDEO_BITS_PER_SECOND = {
  video: 180_000,
  audio: 32_000,
} as const;

export function sumJournalVideoBytes(chunks: Blob[]): number {
  return chunks.reduce((sum, chunk) => sum + chunk.size, 0);
}

export function formatJournalVideoClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatJournalVideoSizeMb(bytes: number, digits = 0): string {
  return `${(bytes / (1024 * 1024)).toFixed(digits)} MB`;
}

export function journalVideoRemainingMs(elapsedMs: number): number {
  return Math.max(0, JOURNAL_VIDEO_MAX_DURATION_MS - elapsedMs);
}

/** Target upload rate in bytes/ms — stable estimate for the on-screen countdown. */
export function journalVideoTargetBytesPerMs(): number {
  return JOURNAL_VIDEO_TARGET_BITS_PER_SECOND / 8 / 1000;
}

/** Remaining record time — limited by duration cap and upload size at the target bitrate. */
export function journalVideoEffectiveRemainingMs(elapsedMs: number, bytes: number): number {
  const byTime = journalVideoRemainingMs(elapsedMs);
  const bytesLeft = Math.max(0, JOURNAL_VIDEO_RECORD_STOP_BYTES - bytes);
  const bySize = bytesLeft / journalVideoTargetBytesPerMs();
  return Math.min(byTime, bySize);
}

export function shouldStopJournalVideoRecording(bytes: number, elapsedMs: number): boolean {
  return (
    elapsedMs >= JOURNAL_VIDEO_MAX_DURATION_MS || bytes >= JOURNAL_VIDEO_RECORD_STOP_BYTES
  );
}

export function isJournalVideoUploadTooLarge(bytes: number): boolean {
  return bytes > JOURNAL_VIDEO_MAX_UPLOAD_BYTES;
}

export function journalVideoUploadTooLargeMessage(durationMs: number, bytes?: number): string {
  const mins = Math.max(1, Math.round(durationMs / 60_000));
  const sizePart = bytes != null ? ` (${formatJournalVideoSizeMb(bytes, 1)})` : "";
  return `This ${mins}-minute video${sizePart} is too large to upload (max ~${Math.round(JOURNAL_VIDEO_MAX_UPLOAD_BYTES / (1024 * 1024))} MB). Recording stops automatically before the limit — try again after a fresh deploy, or record at a lower resolution.`;
}
