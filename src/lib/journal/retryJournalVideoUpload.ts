import {
  JOURNAL_VIDEO_RETRY_REQUEST_EVENT,
  listQueuedJournalVideoUploads,
  updateQueuedJournalVideoUpload,
} from "./journalVideoUploadQueue";

/** Requeue only this account's idle item, preserving all upload/transcription checkpoints. */
export async function retryJournalVideoUpload(userId: string, entryId: string, id: string): Promise<boolean> {
  const item = listQueuedJournalVideoUploads(userId).find((row) => row.id === id && row.entryId === entryId);
  if (!item || (item.stage !== "failed" && item.stage !== "deferred-transcription")) return false;
  // A ready queue item bypasses other items' backoffs; the processor still
  // honors each of their leases and never repeats an in-flight upload.
  await updateQueuedJournalVideoUpload(id, { stage: "queued", lastAttemptAt: undefined, lastError: undefined });
  window.dispatchEvent(new CustomEvent(JOURNAL_VIDEO_RETRY_REQUEST_EVENT, { detail: { userId, entryId, id } }));
  return true;
}
