import { useEffect, useRef } from "react";
import {
  processJournalVideoUploadQueue,
  recoverAndSaveJournalVideoRecording,
} from "@/lib/journal/journalVideoUploadProcessor";
import { listQueuedJournalVideoUploads } from "@/lib/journal/journalVideoUploadQueue";
import {
  clearInProgressJournalVideoRecording,
  listInProgressJournalVideoRecordings,
  readInProgressJournalVideoRecording,
} from "@/lib/journal/journalVideoRecordingRecovery";
import { toast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Retry queued journal video uploads when the browser comes back online. */
export function JournalVideoUploadRetry() {
  const online = useOnlineStatus();
  const recoveringRef = useRef(false);

  useEffect(() => {
    if (!online || listQueuedJournalVideoUploads().length === 0) return;
    void processJournalVideoUploadQueue().then(({ processed, failed }) => {
      if (processed > 0) {
        toast({
          title: processed === 1 ? "Queued video uploaded" : `${processed} queued videos uploaded`,
          description: "Transcript merged into your journal entry.",
        });
      }
      if (failed > 0) {
        toast({
          title: "Some queued videos could not upload",
          description: "We'll try again next time you're online.",
          variant: "destructive",
        });
      }
    });
  }, [online]);

  useEffect(() => {
    if (!online || recoveringRef.current) return;
    const recordings = listInProgressJournalVideoRecordings();
    if (!recordings.length) return;

    recoveringRef.current = true;
    void (async () => {
      let recovered = 0;
      let transcriptOnly = 0;
      let failed = 0;
      let discarded = 0;

      for (const recording of recordings) {
        try {
          const payload = await readInProgressJournalVideoRecording(recording.id);
          if (!payload) {
            await clearInProgressJournalVideoRecording(recording.id);
            discarded += 1;
            continue;
          }

          const hasTranscript = Boolean(
            (payload.meta.peakLiveTranscript || payload.meta.liveTranscript || "").trim(),
          );

          // Only give up when there is genuinely nothing to save — no video AND
          // no transcript. A lost video must never discard salvageable words.
          if (payload.video.size === 0 && !hasTranscript) {
            await clearInProgressJournalVideoRecording(recording.id);
            discarded += 1;
            continue;
          }

          await recoverAndSaveJournalVideoRecording(payload.meta, payload.video, payload.audio);
          await clearInProgressJournalVideoRecording(recording.id);
          if (payload.video.size === 0) transcriptOnly += 1;
          else recovered += 1;
        } catch (e) {
          console.warn("[journal-video-recovery] recovery failed:", e);
          failed += 1;
        }
      }

      if (recovered > 0) {
        toast({
          title:
            recovered === 1
              ? "Recovered interrupted video journal"
              : `Recovered ${recovered} interrupted video journals`,
          description: "Video and transcript are attached to your journal entry.",
        });
      }
      if (transcriptOnly > 0) {
        toast({
          title:
            transcriptOnly === 1
              ? "Recovered your journal transcript"
              : `Recovered ${transcriptOnly} journal transcripts`,
          description: "The video was interrupted, but your words were saved to the entry.",
        });
      }
      if (discarded > 0 && recovered === 0 && transcriptOnly === 0 && failed === 0) {
        toast({
          title: "Interrupted recording could not be recovered",
          description: "The browser closed before anything could be saved.",
          variant: "destructive",
        });
      }
      if (failed > 0) {
        toast({
          title: "Interrupted video recovery failed",
          description: "We'll try again next time you're online.",
          variant: "destructive",
        });
      }
      recoveringRef.current = false;
    })();
  }, [online]);

  return null;
}
