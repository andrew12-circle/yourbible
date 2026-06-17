import { memo, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ControlPosition, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import GoogleMapsShell, {
  GoogleMapErrorDetector,
  useJournalGoogleMapsKey,
} from "@/components/journal/GoogleMapsShell";
import { buildOsmStaticMapUrl, computeMapViewport, type LatLng } from "@/lib/maps/mapViewport";
import { journalEntryHref } from "@/lib/journal/entryNavigation";
import { JOURNAL_DEFAULT_MAP_TYPE, type JournalMapTypeId } from "@/lib/maps/googleMaps";
import { cn } from "@/lib/utils";

export interface JournalMapMarker extends LatLng {
  id: string;
  entry_kind: string | null;
}

interface Props {
  markers: JournalMapMarker[];
  /** Cap pins shown; omit to show every located entry. */
  maxMarkers?: number;
  height?: number;
  className?: string;
  /** Zoom out to fit every pin (world-travel journal map). */
  worldView?: boolean;
  mapTypeId?: JournalMapTypeId;
  /** Grow to fill parent height instead of a fixed px height. */
  fillHeight?: boolean;
}

function FitBounds({ positions, worldView }: { positions: LatLng[]; worldView?: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map || positions.length === 0) return;
    const { google } = window;
    if (!google?.maps) return;

    if (positions.length === 1) {
      map.setCenter(positions[0]);
      map.setZoom(worldView ? 10 : 13);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const position of positions) bounds.extend(position);
    map.fitBounds(bounds, { top: 56, right: 48, bottom: 48, left: 48 });
    if (worldView) {
      const listener = google.maps.event.addListenerOnce(map, "idle", () => {
        const z = map.getZoom();
        if (z != null && z > 10) map.setZoom(10);
      });
      return () => google.maps.event.removeListener(listener);
    }
  }, [map, positions, worldView]);

  return null;
}

const GoogleJournalEntriesMap = memo(function GoogleJournalEntriesMap({
  markers,
  height = 360,
  className,
  worldView,
  mapTypeId = JOURNAL_DEFAULT_MAP_TYPE,
  fillHeight,
}: Props) {
  const navigate = useNavigate();
  const apiKey = useJournalGoogleMapsKey()!;
  const viewport = useMemo(() => computeMapViewport(markers, { worldView }), [markers, worldView]);
  const positions = useMemo(() => markers.map(({ lat, lng }) => ({ lat, lng })), [markers]);

  if (!viewport) return null;

  return (
    <GoogleMapsShell
      apiKey={apiKey}
      className={cn("rounded-2xl border border-border", fillHeight && "h-full min-h-0", className)}
      height={fillHeight ? undefined : height}
      fallback={
        <OsmJournalEntriesMap
          markers={markers}
          height={height}
          className={className}
          worldView={worldView}
          fillHeight={fillHeight}
        />
      }
    >
      <Map
        defaultCenter={viewport.center}
        defaultZoom={viewport.zoom}
        mapTypeId={mapTypeId}
        gestureHandling="cooperative"
        disableDefaultUI
        mapTypeControl
        mapTypeControlOptions={{ position: ControlPosition.TOP_RIGHT }}
        zoomControl
        zoomControlOptions={{ position: ControlPosition.RIGHT_CENTER }}
        streetViewControl
        streetViewControlOptions={{ position: ControlPosition.RIGHT_BOTTOM }}
        className="h-full w-full"
      >
        <GoogleMapErrorDetector />
        <FitBounds positions={positions} worldView={worldView} />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            onClick={() => navigate(journalEntryHref(marker.id, marker.entry_kind))}
          />
        ))}
      </Map>
    </GoogleMapsShell>
  );
});

const OsmJournalEntriesMap = memo(function OsmJournalEntriesMap({
  markers,
  height = 360,
  className,
  worldView,
  fillHeight,
}: Props) {
  const mapUrl = useMemo(
    () => buildOsmStaticMapUrl(markers, { worldView }),
    [markers, worldView],
  );
  if (!mapUrl) return null;

  return (
    <div
      className={cn("overflow-hidden rounded-2xl border border-border", fillHeight && "h-full min-h-0", className)}
      style={fillHeight ? undefined : { height }}
    >
      <img
        src={mapUrl}
        alt="Map of journal entry locations"
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
});

/**
 * Journal map tab — interactive Google Maps when `VITE_GOOGLE_MAPS_API_KEY` is set;
 * otherwise OpenStreetMap static image.
 */
function JournalEntriesMap(props: Props) {
  const { maxMarkers, markers, worldView, ...rest } = props;
  const googleMapsKey = useJournalGoogleMapsKey();
  const visible = maxMarkers != null ? markers.slice(0, maxMarkers) : markers;
  if (!visible.length) return null;

  if (googleMapsKey) {
    return <GoogleJournalEntriesMap markers={visible} worldView={worldView} {...rest} />;
  }
  return <OsmJournalEntriesMap markers={visible} worldView={worldView} {...rest} />;
}

export default memo(JournalEntriesMap);
