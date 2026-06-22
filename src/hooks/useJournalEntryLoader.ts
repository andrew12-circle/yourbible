import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedPhotoUrls } from "@/lib/journal/photos";
import { toast } from "@/hooks/use-toast";
import { fetchJournalEntryDetail } from "@/lib/journal/journalEntryDb";
import { formatJournalLoadError } from "@/lib/journal/journalE2eSchema";

export type JournalEntryPhoto = { id: string; storage_path: string; url?: string };

export type LoadedJournalEntry = {
  id: string;
  title: string | null;
  body: string;
  summary: string | null;
  mood: number | null;
  tags: string[];
  entry_at_ts: string;
  pinned: boolean;
  analyze_for_mirror: boolean;
  journal_id: string | null;
  location_name: string | null;
  weather: string | null;
  weather_temp_c: number | null;
  weather_icon: string | null;
  entry_kind: string | null;
  e2e_encrypted?: boolean;
  contentLocked?: boolean;
};

/** Loads a journal entry + photo thumbnails with abort-on-id-change semantics. */
export function useJournalEntryLoader(entryId: string | null) {
  const [entry, setEntry] = useState<LoadedJournalEntry | null>(null);
  const [photos, setPhotos] = useState<JournalEntryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const entryRef = useRef<LoadedJournalEntry | null>(null);

  useEffect(() => {
    entryRef.current = entry;
  }, [entry]);

  const reload = useCallback(async (id: string) => {
    const decrypted = await fetchJournalEntryDetail(id);
    if (decrypted && entryRef.current?.id === id) {
      entryRef.current = decrypted as LoadedJournalEntry;
      setEntry(decrypted as LoadedJournalEntry);
    }
    return decrypted as LoadedJournalEntry | null;
  }, []);

  useEffect(() => {
    if (!entryId) {
      setEntry(null);
      setPhotos([]);
      setLoading(false);
      setNotFound(false);
      entryRef.current = null;
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setEntry(null);
    setPhotos([]);

    (async () => {
      try {
        const decrypted = await fetchJournalEntryDetail(entryId);
        if (cancelled) return;
        if (!decrypted) {
          setLoading(false);
          setNotFound(true);
          return;
        }
        entryRef.current = decrypted as LoadedJournalEntry;
        setEntry(decrypted as LoadedJournalEntry);
        const { data: ph } = await supabase
          .from("journal_photos")
          .select("id,storage_path")
          .eq("entry_id", entryId);
        if (cancelled) return;
        const urls = await getSignedPhotoUrls((ph ?? []).map((p) => p.storage_path));
        if (cancelled) return;
        setPhotos((ph ?? []).map((p) => ({ ...p, url: urls[p.storage_path] })));
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        setLoading(false);
        toast({
          title: "Couldn't load entry",
          description: formatJournalLoadError(error),
          variant: "destructive",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entryId]);

  return {
    entry,
    setEntry,
    entryRef,
    photos,
    setPhotos,
    loading,
    notFound,
    reload,
  };
}
