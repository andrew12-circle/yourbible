import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteEntryVideo, fetchEntryVideos, type JournalVideoRow } from "@/lib/journal/videos";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { journalValueEqual } from "@/lib/journal/journalSaveQueue";
import type { StableMediaUrlCache } from "@/lib/journal/stableMediaUrls";

const EMPTY: JournalVideoRow[] = [];
/** Same-entry reloads preserve the mounted video elements and their signed URLs. */
export function useJournalEntryVideos(entryId: string | null) {
  const dek = useJournalVaultStore((s) => s.dek);
  const locking = useJournalVaultStore((s) => s.locking);
  const e2eEnabled = useJournalVaultStore((s) => s.e2eEnabled);
  const blocked = locking || (e2eEnabled && !dek);
  const cache = useMemo<StableMediaUrlCache>(() => ({ urls: new Map(), pending: new Map() }), [entryId, dek]);
  const [state, setState] = useState<{ id: string; cache: StableMediaUrlCache; videos: JournalVideoRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const latest = useRef({ entryId, cache, blocked }); latest.current = { entryId, cache, blocked };
  const reload = useCallback(async () => {
    const request = ++generation.current;
    if (!entryId || blocked) { setLoading(false); return; }
    setLoading(true); setError(null);
    const matches = () => request === generation.current && latest.current.entryId === entryId && latest.current.cache === cache && !latest.current.blocked;
    try {
      const next = await fetchEntryVideos(entryId, cache);
      if (matches()) setState((previous) => {
        const before = previous?.id === entryId && previous.cache === cache ? previous.videos : [];
        const byId = new Map(before.map((row) => [row.id, row]));
        const videos = next.map((row) => journalValueEqual(byId.get(row.id), row) ? byId.get(row.id)! : row);
        return { id: entryId, cache, videos: videos.length === before.length && videos.every((row, index) => row === before[index]) ? before : videos };
      });
    } catch (cause) {
      if (matches()) setError(cause instanceof Error ? cause.message : "Couldn't refresh this entry's videos.");
    } finally { if (request === generation.current) setLoading(false); }
  }, [entryId, cache, blocked]);
  useEffect(() => {
    void reload();
    const recovered = (event: Event) => {
      const changedEntryId = (event as CustomEvent<{ entryId?: string }>).detail?.entryId;
      if (!changedEntryId || changedEntryId === entryId) void reload();
    };
    window.addEventListener("yourbible:journal-attachments-recovered", recovered);
    return () => { generation.current += 1; window.removeEventListener("yourbible:journal-attachments-recovered", recovered); };
  }, [reload, entryId]);
  const remove = useCallback(async (id: string, storagePath: string) => {
    if (!window.confirm("Remove this video from the journal entry? This cannot be undone.")) return;
    const owner = latest.current;
    await deleteEntryVideo(id, storagePath);
    if (latest.current.entryId !== owner.entryId || latest.current.cache !== owner.cache) return;
    // Invalidate an earlier read so it cannot put a successfully removed video back.
    generation.current += 1; setLoading(false);
    setState((previous) => previous?.id === owner.entryId && previous.cache === owner.cache
      ? { ...previous, videos: previous.videos.filter((video) => video.id !== id) } : previous);
  }, []);
  const current = !blocked && state?.id === entryId && state?.cache === cache;
  return { videos: current ? state.videos : EMPTY, loading, error, reload, remove };
}
