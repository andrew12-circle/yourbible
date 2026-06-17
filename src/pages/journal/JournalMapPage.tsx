import { Link, Navigate, useParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import JournalShell from "@/components/journal/JournalShell";
import { JournalPlacesMapContent } from "@/components/journal/JournalPlacesMap";
import { journalEntryHref } from "@/lib/journal/entryNavigation";
import { useJournalPlaceMarkers } from "@/hooks/useJournalPlaceMarkers";

const MAP_HEIGHT = 520;

export default function JournalMapPage() {
  const { user, loading } = useAuth();
  const { journalId: paramJournalId } = useParams<{ journalId?: string }>();
  const journalId = paramJournalId ?? null;
  const { rows, markers, loading: placesLoading, placeCount } = useJournalPlaceMarkers(journalId);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <JournalShell journalId={journalId} activeTab="map" totalCount={rows.length} backTo="/journal">
      <div className="px-3 pb-6">
        <JournalPlacesMapContent
          markers={markers}
          loading={placesLoading}
          placeCount={placeCount}
          height={MAP_HEIGHT}
          className="mb-4"
          showPlacesChrome
        />

        {!placesLoading && rows.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-lg font-semibold tracking-tight">No located entries</p>
            <p className="text-[15px] text-muted-foreground mt-1">
              Allow location when writing to see entries on the map.
            </p>
          </div>
        ) : !placesLoading ? (
          <>
            <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Entries by place
            </p>
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
          </>
        ) : null}
      </div>
    </JournalShell>
  );
}
