import {
  isJournalVideoRecordingRecoveryClaimable,
  listInProgressJournalVideoRecordings,
} from "@/lib/journal/journalVideoRecordingRecovery";

/** Applying a service-worker update must never reload a live recorder lease. */
export function journalVideoBlocksAppRefresh(nowMs = Date.now()): boolean {
  return listInProgressJournalVideoRecordings().some(
    (recording) => !isJournalVideoRecordingRecoveryClaimable(recording, nowMs),
  );
}
