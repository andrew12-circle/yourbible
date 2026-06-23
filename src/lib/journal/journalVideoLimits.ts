/** Target max journal clip length (continuous record, pause/resume supported). */
export const JOURNAL_VIDEO_MAX_DURATION_MS = 30 * 60 * 1000;

/** Supabase free-tier global upload cap; keep a little headroom for metadata. */
export const JOURNAL_VIDEO_MAX_UPLOAD_BYTES = 48 * 1024 * 1024;

/** Bitrates chosen so ~30 min camera journal fits under the upload cap. */
export const JOURNAL_VIDEO_BITS_PER_SECOND = {
  video: 180_000,
  audio: 32_000,
} as const;

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

export function journalVideoRemainingMs(elapsedMs: number): number {
  return Math.max(0, JOURNAL_VIDEO_MAX_DURATION_MS - elapsedMs);
}

export function isJournalVideoUploadTooLarge(bytes: number): boolean {
  return bytes > JOURNAL_VIDEO_MAX_UPLOAD_BYTES;
}

export function journalVideoUploadTooLargeMessage(durationMs: number): string {
  const mins = Math.max(1, Math.round(durationMs / 60_000));
  return `This ${mins}-minute video is too large to upload (max ~${Math.round(JOURNAL_VIDEO_MAX_UPLOAD_BYTES / (1024 * 1024))} MB on your plan). Try a shorter clip or upgrade Supabase storage limits.`;
}
