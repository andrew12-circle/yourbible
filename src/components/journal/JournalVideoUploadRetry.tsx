import { useEffect } from "react";
import { processJournalVideoUploadQueue } from "@/lib/journal/journalVideoUploadProcessor";
import { listQueuedJournalVideoUploads } from "@/lib/journal/journalVideoUploadQueue";
import { toast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Retry queued journal video uploads when the browser comes back online. */
export function JournalVideoUploadRetry() {
  const online = useOnlineStatus();

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

  return null;
}
