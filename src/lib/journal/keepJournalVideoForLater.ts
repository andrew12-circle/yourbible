import type { JournalVideoCaptureResult } from "./journalVideoCaptureLifecycle";
import { clearInProgressJournalVideoRecording, listInProgressJournalVideoRecordings } from "./journalVideoRecordingRecovery";
import { enqueueFinalizedJournalVideoCaptureForRecovery } from "./journalVideoUploadQueue";

/** Resolve only after the complete recording and its entry identity are durable. */
export async function keepJournalVideoForLater(
  result: JournalVideoCaptureResult,
  owner: { userId: string; entryId: string; anchorOffset: number },
): Promise<void> {
  if (!result.recoveryDraftId) throw new Error("This recording has no recovery identity. Use Save video or Download backup.");
  const stored = listInProgressJournalVideoRecordings().find((row) => row.id === result.recoveryDraftId);
  if (stored && (stored.userId !== owner.userId || stored.entryId !== owner.entryId)) {
    throw new Error("This recording belongs to a different journal entry.");
  }
  await enqueueFinalizedJournalVideoCaptureForRecovery(result, stored ?? {
    id: result.recoveryDraftId, ...owner, durationMs: result.durationMs, startedAt: new Date().toISOString(),
  });
  try { await clearInProgressJournalVideoRecording(result.recoveryDraftId); }
  catch { /* The durable queue now owns the full copy; cleanup can retry later. */ }
}
