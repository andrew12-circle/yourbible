import { Link } from "react-router-dom";
import { Loader2, MapPin } from "lucide-react";
import JournalEntriesMap, { type JournalMapMarker } from "@/components/journal/JournalEntriesMap";
import { useJournalPlaceMarkers } from "@/hooks/useJournalPlaceMarkers";
import {
  JOURNAL_DEFAULT_MAP_TYPE,
  JOURNAL_OVERVIEW_MAP_TYPE,
  type JournalMapTypeId,
} from "@/lib/maps/googleMaps";
import { cn } from "@/lib/utils";

interface ContentProps {
  markers: JournalMapMarker[];
  loading: boolean;
  placeCount: number;
  height?: number;
  className?: string;
  showPlacesChrome?: boolean;
  viewAllHref?: string;
  mapTypeId?: JournalMapTypeId;
  fillHeight?: boolean;
}

export function JournalPlacesMapContent({
  markers,
  loading,
  placeCount,
  height = 360,
  className,
  showPlacesChrome = true,
  viewAllHref,
  mapTypeId = JOURNAL_DEFAULT_MAP_TYPE,
  fillHeight = false,
}: ContentProps) {
  const shellClass = cn(fillHeight && "flex min-h-0 flex-1 flex-col", className);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-2xl border border-border bg-muted/30 text-muted-foreground",
          fillHeight ? "min-h-[280px] flex-1" : undefined,
          shellClass,
        )}
        style={fillHeight ? undefined : { height }}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="text-sm">Loading places…</span>
      </div>
    );
  }

  if (placeCount === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground",
          fillHeight ? "min-h-[200px] flex-1" : undefined,
          shellClass,
        )}
        style={fillHeight ? undefined : { height: Math.min(height, 200) }}
      >
        <MapPin className="h-5 w-5 opacity-60" aria-hidden />
        <p>Allow location when writing to build your journal map.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", fillHeight && "flex min-h-0 flex-1 flex-col", shellClass)}>
      {showPlacesChrome ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
          <div className="rounded-full border border-border/60 bg-background/95 px-3 py-1.5 text-[12px] font-medium shadow-sm backdrop-blur">
            {placeCount} {placeCount === 1 ? "place" : "places"}
          </div>
          {viewAllHref ? (
            <Link
              to={viewAllHref}
              className="pointer-events-auto rounded-full border border-border/60 bg-background/95 px-3 py-1.5 text-[12px] font-medium shadow-sm backdrop-blur hover:bg-muted"
            >
              Open map
            </Link>
          ) : null}
        </div>
      ) : null}
      <JournalEntriesMap
        markers={markers}
        height={height}
        worldView
        mapTypeId={mapTypeId}
        fillHeight={fillHeight}
        className={fillHeight ? "min-h-0 flex-1" : undefined}
      />
    </div>
  );
}

interface Props extends Omit<ContentProps, "markers" | "loading" | "placeCount"> {
  journalId?: string | null;
}

export default function JournalPlacesMap({ journalId = null, ...rest }: Props) {
  const { markers, loading, placeCount } = useJournalPlaceMarkers(journalId);
  return (
    <JournalPlacesMapContent
      markers={markers}
      loading={loading}
      placeCount={placeCount}
      {...rest}
    />
  );
}

export { JOURNAL_OVERVIEW_MAP_TYPE };
