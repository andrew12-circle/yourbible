import { useCallback, useEffect, useState } from "react";
import {
  fetchConversationEntryPreview,
  getOrCreateMorningConversationEntry,
} from "@/lib/livingHope/morningConversationJournal";
import { localDateISO } from "@/lib/lifePriorities";

export function useMorningConversationEntry(userId: string | undefined) {
  const [entryId, setEntryId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string | null; excerpt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reviewDate = localDateISO();

  const refreshPreview = useCallback(async (id: string) => {
    const row = await fetchConversationEntryPreview(id);
    setPreview(row);
  }, []);

  const ensureEntry = useCallback(async () => {
    if (!userId) return null;
    setBusy(true);
    setError(null);
    try {
      const { entryId: id } = await getOrCreateMorningConversationEntry(userId, reviewDate);
      setEntryId(id);
      await refreshPreview(id);
      return id;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open journal");
      return null;
    } finally {
      setBusy(false);
    }
  }, [userId, reviewDate, refreshPreview]);

  useEffect(() => {
    if (!userId) return;
    void ensureEntry();
  }, [userId, ensureEntry]);

  return {
    entryId,
    preview,
    busy,
    error,
    ensureEntry,
    refreshPreview,
  };
}
