import { useCallback, useEffect, useState } from "react";
import { deleteEntryVideo, fetchEntryVideos, type JournalVideoRow } from "@/lib/journal/videos";

export function useJournalEntryVideos(entryId: string | null) {
  const [videos, setVideos] = useState<JournalVideoRow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!entryId) {
      setVideos([]);
      return;
    }
    setLoading(true);
    try {
      setVideos(await fetchEntryVideos(entryId));
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remove = useCallback(async (id: string, storagePath: string) => {
    await deleteEntryVideo(id, storagePath);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return { videos, loading, reload, remove };
}
