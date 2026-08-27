import { useCallback, useEffect, useRef, useState } from "react";
import { deleteEntryVideo, fetchEntryVideos, type JournalVideoRow } from "@/lib/journal/videos";

export function useJournalEntryVideos(entryId: string | null) {
  const [videos, setVideos] = useState<JournalVideoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const requestGenerationRef = useRef(0);

  const reload = useCallback(async () => {
    const generation = ++requestGenerationRef.current;
    setVideos([]);
    if (!entryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchEntryVideos(entryId);
      if (generation === requestGenerationRef.current) setVideos(next);
    } catch {
      if (generation === requestGenerationRef.current) setVideos([]);
    } finally {
      if (generation === requestGenerationRef.current) setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    void reload();
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [reload]);

  const remove = useCallback(async (id: string, storagePath: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Remove this video from the journal entry? This cannot be undone.")
    ) {
      return;
    }
    const generation = requestGenerationRef.current;
    await deleteEntryVideo(id, storagePath);
    if (generation === requestGenerationRef.current) {
      setVideos((prev) => prev.filter((v) => v.id !== id));
    }
  }, []);

  return { videos, loading, reload, remove };
}
