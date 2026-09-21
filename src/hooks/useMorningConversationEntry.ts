import { formatSupabaseError } from "@/lib/supabase/errors";
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
      setError(formatSupabaseError(e));
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
        setError(formatSupabaseError(e));
        return null;
      }
    },
    [userId, entryId, reviewDate, refreshPreview],
  );

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setEntryId(null);
    setPreview(null);
    void findMorningConversationEntry(userId, reviewDate).then(async (id) => {
      if (!active || !id) return;
      setEntryId(id);
      await refreshPreview(id);
    }).catch((e) => { if (active) setError(formatSupabaseError(e)); });
    return () => { active = false; };
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
