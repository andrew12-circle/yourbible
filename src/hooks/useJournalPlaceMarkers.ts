import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { JournalMapMarker } from "@/components/journal/JournalEntriesMap";

export interface JournalPlaceRow {
  id: string;
  title: string | null;
  body: string;
  entry_at_ts: string;
  lat: number;
  lng: number;
  location_name: string | null;
  entry_kind: string | null;
}

export function useJournalPlaceMarkers(journalId: string | null) {
  const { user } = useAuth();
  const [rows, setRows] = useState<JournalPlaceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      let q = supabase
        .from("journal_entries")
        .select("id,title,body,entry_at_ts,lat,lng,location_name,entry_kind")
        .or("entry_kind.is.null,entry_kind.neq.vent")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .order("entry_at_ts", { ascending: false })
        .limit(2000);

      if (journalId) q = q.eq("journal_id", journalId);

      const { data } = await q;
      if (!cancelled) {
        setRows((data as JournalPlaceRow[]) ?? []);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, journalId]);

  const markers = useMemo<JournalMapMarker[]>(
    () =>
      rows.map((row) => ({
        id: row.id,
        lat: row.lat,
        lng: row.lng,
        entry_kind: row.entry_kind,
      })),
    [rows],
  );

  return { rows, markers, loading, placeCount: rows.length };
}
