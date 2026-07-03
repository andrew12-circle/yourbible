import { useEffect, useRef } from "react";
import {
  processJournalVideoUploadQueue,
  saveJournalVideoCapture,
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
      let failed = 0;
      let discarded = 0;

      for (const recording of recordings) {
        try {
          const payload = await readInProgressJournalVideoRecording(recording.id);
          if (!payload || payload.video.size === 0) {
            await clearInProgressJournalVideoRecording(recording.id);
            discarded += 1;
            continue;
          }

          await saveJournalVideoCapture(
            payload.meta.userId,
            payload.meta.entryId,
            payload.video,
            payload.audio,
            payload.meta.durationMs,
            payload.meta.anchorOffset,
            payload.meta.liveTranscript,
            payload.meta.chapters,
            payload.meta.peakLiveTranscript,
          );
          await clearInProgressJournalVideoRecording(recording.id);
          recovered += 1;
        } catch (e) {
          console.warn("[journal-video-recovery] upload failed:", e);
          failed += 1;
        }
      }

      if (recovered > 0) {
        toast({
          title:
            recovered === 1
              ? "Recovered interrupted video journal"
              : `Recovered ${recovered} interrupted video journals`,
          description: "The video is attached to its journal entry.",
        });
      }
      if (discarded > 0 && recovered === 0 && failed === 0) {
        toast({
          title: "Interrupted video could not be recovered",
          description: "The browser closed before any video chunks were saved.",
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
