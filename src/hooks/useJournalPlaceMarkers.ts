import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { JournalMapMarker } from "@/components/journal/JournalEntriesMap";
import { fetchJournalCollection } from "@/lib/journal/journalCollectionRead";
import { useJournalVaultStore } from "@/stores/journalVaultStore";

export interface JournalPlaceRow {
  id: string; title: string | null; body: string; entry_at_ts: string;
  lat: number; lng: number; location_name: string | null; entry_kind: string | null;
  contentLocked?: boolean;
}

export function useJournalPlaceMarkers(journalId: string | null) {
  const { user } = useAuth();
  const dek = useJournalVaultStore((state) => state.dek);
  const [data, setData] = useState<{ userId: string; journalId: string | null; dek: CryptoKey | null;
    rows: JournalPlaceRow[]; error: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = user?.id;
  const current = data?.userId === userId && data?.journalId === journalId && data?.dek === dek;
  const rows = current ? data.rows : [];
  const error = current ? data.error : null;

  useEffect(() => {
    if (!userId) { setData(null); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    void fetchJournalCollection(userId, { journalId, locatedOnly: true, signal: controller.signal })
      .then((entries) => {
        if (controller.signal.aborted) return;
        const places = entries.filter((row) => row.lat != null && row.lng != null).map((row) => ({
          id: row.id, title: row.title, body: row.body.slice(0, 240), entry_at_ts: row.entry_at_ts,
          lat: row.lat!, lng: row.lng!, location_name: row.location_name, entry_kind: row.entry_kind,
          contentLocked: row.contentLocked,
        })).sort((a, b) => b.entry_at_ts.localeCompare(a.entry_at_ts) || a.id.localeCompare(b.id));
        setData({ userId, journalId, dek, rows: places, error: null });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setData({ userId, journalId, dek, rows: [],
          error: cause instanceof Error ? cause.message : "Could not load journal places." });
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId, journalId, dek]);

  const markers = useMemo<JournalMapMarker[]>(() => rows.map((row) => ({
    id: row.id, lat: row.lat, lng: row.lng, entry_kind: row.entry_kind,
  })), [rows]);
  return { rows, markers, loading: Boolean(userId) && (loading || !current), error, placeCount: rows.length };
}
