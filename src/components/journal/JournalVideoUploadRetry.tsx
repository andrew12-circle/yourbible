import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  processJournalVideoUploadQueue,
  recoverAndSaveJournalVideoRecording,
  type ProcessJournalVideoUploadResult,
} from "@/lib/journal/journalVideoUploadProcessor";
import {
  enqueueFinalizedJournalVideoCaptureForRecovery,
  journalVideoQueueNextRetryDelay,
  journalVideoQueueStorageAddedIds,
  JOURNAL_VIDEO_UPLOAD_QUEUE_CHANGED_EVENT,
  JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY,
  JOURNAL_VIDEO_QUEUE_RETRY_DELAYS_MS,
  listQueuedJournalVideoUploads,
  withJournalVideoUploadQueueLock,
  type JournalVideoUploadQueueChangeDetail,
} from "@/lib/journal/journalVideoUploadQueue";
import {
  clearInProgressJournalVideoRecording,
  isJournalVideoRecordingRecoveryClaimable,
  JOURNAL_VIDEO_RECOVERY_CHANGED_EVENT,
  JOURNAL_VIDEO_RECOVERY_META_KEY,
  listClaimableJournalVideoRecordings,
  readInProgressJournalVideoRecording,
  updateInProgressJournalVideoRecording,
  withJournalVideoRecoveryClaimLock,
  type JournalVideoRecordingRecoveryPayload,
} from "@/lib/journal/journalVideoRecordingRecovery";
import { pickBestVideoJournalTranscript } from "@/lib/journal/journalVideoBody";
import type { JournalVideoCaptureResult } from "@/lib/journal/journalVideoCaptureLifecycle";
import { enrichVideoJournalEntry } from "@/lib/journal/videoJournalEnrich";
import { toast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const QUEUE_CHANGE_DEBOUNCE_MS = 250;
const QUEUE_MAX_SCHEDULE_DELAY_MS = 15 * 60_000;
const QUEUE_CONTENTION_RETRY_DELAYS_MS = [750, 2_000, 5_000] as const;

type RecoverySummary = {
  recovered: number;
  transcriptOnly: number;
  deferredTranscription: number;
  queuedForRetry: number;
  failed: number;
  discarded: number;
};

function emptyRecoverySummary(): RecoverySummary {
  return {
    recovered: 0,
    transcriptOnly: 0,
    deferredTranscription: 0,
    queuedForRetry: 0,
    failed: 0,
    discarded: 0,
  };
}

type RecoveryClaimAction =
  | { kind: "skipped" }
  | { kind: "discarded" }
  | { kind: "video"; payload: JournalVideoRecordingRecoveryPayload }
  | { kind: "transcript"; payload: JournalVideoRecordingRecoveryPayload };

async function enrichCompletedVideoJournalEntries(
  userId: string,
  entryIds: string[],
): Promise<void> {
  for (const entryId of [...new Set(entryIds)]) {
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("body")
        .eq("id", entryId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (typeof data?.body === "string") {
        await enrichVideoJournalEntry({ entryId, body: data.body });
      }
    } catch (error) {
      // Enrichment is idempotent and supplemental. It must never retain or
      // recreate an upload queue item that has already completed durably.
      console.warn("[journal-video-queue] post-upload enrichment failed:", error);
    }
  }
}

/** Recover only stale/finalized drafts belonging to the authenticated account. */
async function recoverJournalVideoDrafts(userId: string): Promise<RecoverySummary> {
  const summary = emptyRecoverySummary();
  const recordings = listClaimableJournalVideoRecordings().filter(
    (recording) => recording.userId === userId,
  );

  for (const recording of recordings) {
    try {
      const claim = await withJournalVideoRecoveryClaimLock<RecoveryClaimAction>(
        recording.id,
        async () => {
          const payload = await readInProgressJournalVideoRecording(recording.id);
          if (!payload) {
            await clearInProgressJournalVideoRecording(recording.id);
            return { kind: "discarded" };
          }

          // Recheck the durable payload instead of trusting the list snapshot.
          if (
            payload.meta.userId !== userId ||
            !isJournalVideoRecordingRecoveryClaimable(payload.meta)
          ) {
            return { kind: "skipped" };
          }
          const liveCaptions = pickBestVideoJournalTranscript(
            payload.meta.peakLiveTranscript,
            payload.meta.liveTranscript,
          ).trim();
          const hasTranscript = Boolean(liveCaptions);
          const hasVideo = payload.video.size > 0;

          if (!hasVideo && !hasTranscript) {
            await clearInProgressJournalVideoRecording(recording.id);
            return { kind: "discarded" };
          }

          if (
            !updateInProgressJournalVideoRecording(recording.id, {
              status: "finalizing",
              heartbeatAt: new Date().toISOString(),
            })
          ) {
            throw new Error("Could not claim the recovery checkpoint.");
          }
          return { kind: hasVideo ? "video" : "transcript", payload };
        },
      );
      if (!claim.claimed) continue;
      const action = claim.value;
      if (action.kind === "discarded") summary.discarded += 1;
      if (action.kind === "video") {
        const result: JournalVideoCaptureResult = {
          video: action.payload.video,
          audio: action.payload.audio,
          liveTranscript: action.payload.meta.liveTranscript,
          peakLiveTranscript: action.payload.meta.peakLiveTranscript,
          chapters: action.payload.meta.chapters,
          durationMs: action.payload.meta.durationMs,
          recoveryDraftId: action.payload.meta.id,
        };
        // Waiting for a busy queue retains the full Blob outside the recovery
        // lock; another claimant is safe because promotion is idempotent by id.
        await enqueueFinalizedJournalVideoCaptureForRecovery(result, action.payload.meta);
        const clearClaim = await withJournalVideoRecoveryClaimLock(recording.id, async () => {
          await clearInProgressJournalVideoRecording(recording.id);
          return true;
        });
        if (clearClaim.claimed) summary.queuedForRetry += 1;
        continue;
      }
      if (action.kind !== "transcript") continue;

      // Supabase body merge is intentionally outside the recovery Web Lock.
      // A fresh finalizing lease prevents normal duplicate claims meanwhile.
      await recoverAndSaveJournalVideoRecording(
        action.payload.meta,
        action.payload.video,
        action.payload.audio,
      );
      const clearClaim = await withJournalVideoRecoveryClaimLock(recording.id, async () => {
        await clearInProgressJournalVideoRecording(recording.id);
        return true;
      });
      if (clearClaim.claimed) summary.transcriptOnly += 1;
    } catch (error) {
      console.warn("[journal-video-recovery] recovery failed:", error);
      // Once a durable upload-queue copy exists, the recording is safe even if
      // its immediate network/transcription attempt failed.
      if (listQueuedJournalVideoUploads(userId).some((item) => item.id === recording.id)) {
        summary.queuedForRetry += 1;
      } else {
        summary.failed += 1;
      }
    }
  }

  return summary;
}

function showRecoverySummary(summary: RecoverySummary): void {
  if (summary.recovered > 0) {
    toast({
      title:
        summary.recovered === 1
          ? "Recovered interrupted video journal"
          : `Recovered ${summary.recovered} interrupted video journals`,
      description:
        summary.deferredTranscription > 0
          ? "Your video is safe. Transcription will retry automatically."
          : "Video and transcript are attached to your journal entry.",
    });
  }
  if (summary.transcriptOnly > 0) {
    toast({
      title:
        summary.transcriptOnly === 1
          ? "Recovered your journal transcript"
          : `Recovered ${summary.transcriptOnly} journal transcripts`,
      description: "The video was interrupted, but your words were saved to the entry.",
    });
  }
  if (summary.queuedForRetry > 0) {
    toast({
      title: "Interrupted video is safe on this device",
      description: "Its upload or transcription will retry the next time you're online.",
    });
  }
  if (summary.discarded > 0 && summary.recovered === 0 && summary.transcriptOnly === 0) {
    toast({
      title: "Interrupted recording could not be recovered",
      description: "The browser closed before any video or words reached local storage.",
      variant: "destructive",
    });
  }
  if (summary.failed > 0) {
    toast({
      title: "Interrupted video recovery needs another try",
      description: "The local recovery copy was kept. Reopen the app while online to retry.",
      variant: "destructive",
    });
  }
}

function showQueueSummary(queue: ProcessJournalVideoUploadResult): void {
  if (queue.completed > 0) {
    toast({
      title:
        queue.completed === 1
          ? "Queued video journal finished saving"
          : `${queue.completed} queued video journals finished saving`,
      description: "Video and transcript are attached to your journal.",
    });
  }
  if (queue.deferredTranscription > 0) {
    toast({
      title: "Video uploaded; transcription is still retrying",
      description: "Your video is safe and remains in the retry queue.",
    });
  }
  if (queue.failed > 0) {
    toast({
      title: "Some video journals still need to upload",
      description: "Their local copies were kept and will retry later.",
      variant: "destructive",
    });
  }
}

/** Coordinate current-user recovery and queued uploads on online/focus lifecycle events. */
export function JournalVideoUploadRetry() {
  const online = useOnlineStatus();
  const { user, loading } = useAuth();
  const latestRef = useRef({ online, loading, userId: user?.id ?? null });
  const runningRef = useRef(false);
  const pendingRecoveryRef = useRef(false);
  const pendingQueueRef = useRef(false);
  const queueContentionAttemptsRef = useRef(0);
  const triggerRef = useRef<(includeQueue: boolean) => void>(() => undefined);
  latestRef.current = { online, loading, userId: user?.id ?? null };

  useEffect(() => {
    let disposed = false;
    let recoveryEventTimer: number | null = null;
    let queueEventTimer: number | null = null;
    let queueEventDueAt = 0;

    function scheduleQueueRun(delayMs: number, resetContention = false): void {
      if (disposed) return;
      if (resetContention) queueContentionAttemptsRef.current = 0;
      const boundedDelay = Math.max(0, Math.min(delayMs, QUEUE_MAX_SCHEDULE_DELAY_MS));
      const dueAt = Date.now() + boundedDelay;
      if (queueEventTimer != null && queueEventDueAt <= dueAt) return;
      if (queueEventTimer != null) window.clearTimeout(queueEventTimer);
      queueEventDueAt = dueAt;
      queueEventTimer = window.setTimeout(() => {
        queueEventTimer = null;
        queueEventDueAt = 0;
        void run(true);
      }, boundedDelay);
    }

    function scheduleQueueContentionRetry(): void {
      const attempt = queueContentionAttemptsRef.current;
      if (attempt >= QUEUE_CONTENTION_RETRY_DELAYS_MS.length) return;
      queueContentionAttemptsRef.current += 1;
      scheduleQueueRun(QUEUE_CONTENTION_RETRY_DELAYS_MS[attempt]);
    }

    async function run(includeQueue: boolean): Promise<void> {
      pendingRecoveryRef.current = true;
      pendingQueueRef.current ||= includeQueue;
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        while (!disposed && (pendingRecoveryRef.current || pendingQueueRef.current)) {
          const shouldProcessQueue = pendingQueueRef.current;
          pendingRecoveryRef.current = false;
          pendingQueueRef.current = false;
          const latest = latestRef.current;
          if (latest.loading || !latest.userId || !latest.online) continue;

          const recovery = await recoverJournalVideoDrafts(latest.userId);
          if (!disposed) showRecoverySummary(recovery);

          if (!shouldProcessQueue && recovery.queuedForRetry === 0) continue;
          const rows = listQueuedJournalVideoUploads(latest.userId);
          if (!rows.length) {
            queueContentionAttemptsRef.current = 0;
            continue;
          }
          const nextRetryDelay = journalVideoQueueNextRetryDelay(rows);
          if (nextRetryDelay > 0) {
            scheduleQueueRun(nextRetryDelay + QUEUE_CHANGE_DEBOUNCE_MS);
            continue;
          }

          try {
            const queueClaim = await withJournalVideoUploadQueueLock(() =>
              processJournalVideoUploadQueue(latest.userId),
            );
            if (!queueClaim.claimed) {
              scheduleQueueContentionRetry();
              continue;
            }
            queueContentionAttemptsRef.current = 0;
            if (!disposed) showQueueSummary(queueClaim.value);
            const remainingRows = listQueuedJournalVideoUploads(latest.userId);
            if (remainingRows.length > 0) {
              const metadataDelay = journalVideoQueueNextRetryDelay(remainingRows);
              const failedPassFloor =
                queueClaim.value.failed > 0 ? JOURNAL_VIDEO_QUEUE_RETRY_DELAYS_MS[0] : 0;
              scheduleQueueRun(
                Math.max(
                  QUEUE_CHANGE_DEBOUNCE_MS,
                  failedPassFloor,
                  metadataDelay + QUEUE_CHANGE_DEBOUNCE_MS,
                ),
              );
            }
            await enrichCompletedVideoJournalEntries(
              latest.userId,
              queueClaim.value.completedEntryIds,
            );
          } catch (error) {
            console.warn("[journal-video-queue] coordinated retry failed:", error);
            scheduleQueueContentionRetry();
          }
        }
      } finally {
        runningRef.current = false;
      }
    }

    const runAll = () => {
      queueContentionAttemptsRef.current = 0;
      void run(true);
    };
    triggerRef.current = (includeQueue) => void run(includeQueue);
    const runRecovery = () => {
      if (document.visibilityState !== "visible") return;
      if (recoveryEventTimer != null) window.clearTimeout(recoveryEventTimer);
      recoveryEventTimer = window.setTimeout(() => {
        recoveryEventTimer = null;
        void run(false);
      }, 150);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") runAll();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === JOURNAL_VIDEO_RECOVERY_META_KEY) runRecovery();
      if (
        event.key === JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY &&
        journalVideoQueueStorageAddedIds(event.oldValue, event.newValue).length > 0
      ) {
        scheduleQueueRun(QUEUE_CHANGE_DEBOUNCE_MS, true);
      }
    };
    const onQueueChange = (event: Event) => {
      const detail = (event as CustomEvent<JournalVideoUploadQueueChangeDetail>).detail;
      if (detail?.kind === "enqueued") {
        scheduleQueueRun(QUEUE_CHANGE_DEBOUNCE_MS, true);
      }
    };

    runAll();
    window.addEventListener("online", runAll);
    window.addEventListener("focus", runAll);
    window.addEventListener("storage", onStorage);
    window.addEventListener(JOURNAL_VIDEO_RECOVERY_CHANGED_EVENT, runRecovery);
    window.addEventListener(JOURNAL_VIDEO_UPLOAD_QUEUE_CHANGED_EVENT, onQueueChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      triggerRef.current = () => undefined;
      if (recoveryEventTimer != null) window.clearTimeout(recoveryEventTimer);
      if (queueEventTimer != null) window.clearTimeout(queueEventTimer);
      window.removeEventListener("online", runAll);
      window.removeEventListener("focus", runAll);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(JOURNAL_VIDEO_RECOVERY_CHANGED_EVENT, runRecovery);
      window.removeEventListener(JOURNAL_VIDEO_UPLOAD_QUEUE_CHANGED_EVENT, onQueueChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    triggerRef.current(true);
  }, [loading, online, user?.id]);

  return null;
}
