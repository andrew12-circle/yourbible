import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalShell from "@/components/journal/JournalShell";
import JournalEntriesMap from "@/components/journal/JournalEntriesMap";
import { journalEntryHref } from "@/lib/journal/entryNavigation";

interface Row {
  id: string;
  title: string | null;
  body: string;
  entry_at_ts: string;
  lat: number;
  lng: number;
  location_name: string | null;
  entry_kind: string | null;
}

const MAX_MAP_MARKERS = 25;

export default function JournalMapPage() {
  const { user, loading } = useAuth();
  const { journalId: paramJournalId } = useParams<{ journalId?: string }>();
  const journalId = paramJournalId ?? null;
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      let q = supabase
        .from("journal_entries")
        .select("id,title,body,entry_at_ts,lat,lng,location_name,entry_kind")
        .or("entry_kind.is.null,entry_kind.neq.vent")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .order("entry_at_ts", { ascending: false })
        .limit(500);
      if (journalId) q = q.eq("journal_id", journalId);
      const { data } = await q;
      setRows((data as Row[]) ?? []);
    })();
  }, [user, journalId]);

  const mapMarkers = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        lat: row.lat,
        lng: row.lng,
        entry_kind: row.entry_kind,
      })),
    [rows],
  );

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <JournalShell journalId={journalId} activeTab="map" totalCount={rows.length} backTo="/journal">
      <div className="px-3">
        {mapMarkers.length > 0 ? (
          <JournalEntriesMap markers={mapMarkers} maxMarkers={MAX_MAP_MARKERS} className="mb-2" />
        ) : null}
        {rows.length > MAX_MAP_MARKERS && (
          <p className="mb-4 text-center text-[12px] text-muted-foreground">
            Showing {MAX_MAP_MARKERS} of {rows.length} locations on the map.
          </p>
        )}

        {rows.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-lg font-semibold tracking-tight">No located entries</p>
            <p className="text-[15px] text-muted-foreground mt-1">
              Allow location when writing to see entries on the map.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50 bg-card rounded-xl border border-border">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to={journalEntryHref(r.id, r.entry_kind)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40"
                >
                  <MapPin className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {new Date(r.entry_at_ts).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {r.location_name ? ` · ${r.location_name}` : ""}
                    </div>
                    {r.title && (
                      <div className="font-semibold text-[15px] truncate">{r.title}</div>
                    )}
                    <p className="text-[13px] text-foreground/75 line-clamp-1">{r.body}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </JournalShell>
  );
}
