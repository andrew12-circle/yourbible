import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LibraryCorpusStatRow } from "@/lib/framework/artifactCorpusStanding";
import { fetchLibraryCorpusStats } from "@/lib/framework/fetchCorpusStanding";

export function useLibraryCorpusStats(userId: string | undefined) {
  const [rows, setRows] = useState<LibraryCorpusStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { rows: nextRows, error: loadError } = await fetchLibraryCorpusStats(supabase, userId);
    if (loadError) {
      setError(loadError);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows(nextRows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, error, reload: load };
}
