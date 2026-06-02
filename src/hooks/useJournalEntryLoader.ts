import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedPhotoUrls } from "@/lib/journal/photos";
import { toast } from "@/hooks/use-toast";

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
};

const ENTRY_SELECT =
  "id,title,body,summary,mood,tags,entry_at_ts,pinned,analyze_for_mirror,journal_id,location_name,weather,weather_temp_c,weather_icon,entry_kind";

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
    const { data } = await supabase.from("journal_entries").select(ENTRY_SELECT).eq("id", id).maybeSingle();
    const row = (data as LoadedJournalEntry | null) ?? null;
    if (row && entryRef.current?.id === id) {
      entryRef.current = row;
      setEntry(row);
    }
    return row;
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
      const { data, error } = await supabase
        .from("journal_entries")
        .select(ENTRY_SELECT)
        .eq("id", entryId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoading(false);
        toast({ title: "Couldn't load entry", description: error.message, variant: "destructive" });
        return;
      }
      const row = (data as LoadedJournalEntry | null) ?? null;
      if (!row) {
        setLoading(false);
        setNotFound(true);
        return;
      }
      entryRef.current = row;
      setEntry(row);
      const { data: ph } = await supabase
        .from("journal_photos")
        .select("id,storage_path")
        .eq("entry_id", entryId);
      if (cancelled) return;
      const urls = await getSignedPhotoUrls((ph ?? []).map((p) => p.storage_path));
      if (cancelled) return;
      setPhotos((ph ?? []).map((p) => ({ ...p, url: urls[p.storage_path] })));
      setLoading(false);
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
