export const JOURNAL_VIDEO_UPLOAD_PROGRESS_EVENT = "yourbible:journal-video-upload-progress";
export type JournalVideoUploadProgress = {
  id: string;
  userId: string;
  entryId: string;
  loaded: number;
  total: number;
};
const progress = new Map<string, JournalVideoUploadProgress>();

export function readJournalVideoUploadProgress(id: string): JournalVideoUploadProgress | undefined {
  return progress.get(id);
}

/** Progress is ephemeral and isolated from entry/map state and the durable queue index. */
export function reportJournalVideoUploadProgress(value: JournalVideoUploadProgress): void {
  const previous = progress.get(value.id);
  progress.set(value.id, value);
  while (progress.size > 128) progress.delete(progress.keys().next().value!);
  if (previous && Math.floor(previous.loaded / Math.max(1, previous.total) * 100) ===
    Math.floor(value.loaded / Math.max(1, value.total) * 100)) return;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(JOURNAL_VIDEO_UPLOAD_PROGRESS_EVENT, { detail: value }));
  }
}

export function clearJournalVideoUploadProgress(id: string): void {
  progress.delete(id);
}
