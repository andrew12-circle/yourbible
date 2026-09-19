import { useCallback, useEffect, useState } from "react";
import { inspectJournalVideoStorage, type JournalVideoStorageHealth } from "@/lib/journal/journalVideoStorage";
import { listQueuedJournalVideoUploads } from "@/lib/journal/journalVideoUploadQueue";

export function useJournalVideoStorageHealth(open: boolean, userId?: string) {
  const [health, setHealth] = useState<JournalVideoStorageHealth | null>(null);
  const [revision, setRevision] = useState(0);
  const recheck = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let cancelled = false;
    setHealth(null);
    if (!open) return;
    const count = userId ? listQueuedJournalVideoUploads(userId).length : 0;
    void inspectJournalVideoStorage(count).then((value) => { if (!cancelled) setHealth(value); });
    return () => { cancelled = true; };
  }, [open, userId, revision]);
  return { health, recheck };
}
