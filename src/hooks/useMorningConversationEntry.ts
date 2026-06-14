import { useCallback, useEffect, useState } from "react";
import {
  extractWorshipNote,
  fetchConversationEntryPreview,
  findMorningConversationEntry,
  getOrCreateMorningConversationEntry,
  syncThanksgivingToConversationEntry,
} from "@/lib/livingHope/morningConversationJournal";
import type { ThanksgivingLists } from "@/lib/livingHope/morningRitual";
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
      setError(e instanceof Error ? e.message : "Couldn't start today's journal");
      return null;
    } finally {
      setBusy(false);
    }
  }, [userId, reviewDate, refreshPreview]);

  const syncThanksgiving = useCallback(
    async (lists: ThanksgivingLists) => {
      if (!userId) return null;
      setError(null);
      try {
        let id = entryId;
        if (!id) {
          const { entryId: createdId } = await getOrCreateMorningConversationEntry(userId, reviewDate);
          id = createdId;
          setEntryId(id);
        }
        await syncThanksgivingToConversationEntry(userId, id, lists);
        await refreshPreview(id);
        return id;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save thanksgiving");
        return null;
      }
    },
    [userId, entryId, reviewDate, refreshPreview],
  );

  useEffect(() => {
    if (!userId) return;
    void findMorningConversationEntry(userId, reviewDate).then((id) => {
      if (!id) return;
      setEntryId(id);
      void refreshPreview(id);
    });
  }, [userId, reviewDate, refreshPreview]);

  return {
    entryId,
    preview,
    busy,
    error,
    ensureEntry,
    refreshPreview,
    syncThanksgiving,
  };
}
