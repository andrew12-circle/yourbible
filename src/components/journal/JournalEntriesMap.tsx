import { memo, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { APIProvider, ControlPosition, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { getGoogleMapsApiKey } from "@/lib/maps/googleMaps";
import { buildOsmStaticMapUrl, computeMapViewport, type LatLng } from "@/lib/maps/mapViewport";
import { journalEntryHref } from "@/lib/journal/entryNavigation";
import { cn } from "@/lib/utils";

export interface JournalMapMarker extends LatLng {
  id: string;
  entry_kind: string | null;
}

interface Props {
  markers: JournalMapMarker[];
  maxMarkers?: number;
  height?: number;
  className?: string;
}

function FitBounds({ positions }: { positions: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || positions.length === 0) return;
    const { google } = window;
    if (!google?.maps) return;

    if (positions.length === 1) {
      map.setCenter(positions[0]);
      map.setZoom(13);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const position of positions) bounds.extend(position);
    map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }, [map, positions]);

  return null;
}

const GoogleJournalEntriesMap = memo(function GoogleJournalEntriesMap({
  markers,
  height = 360,
  className,
}: Props) {
  const navigate = useNavigate();
  const apiKey = getGoogleMapsApiKey()!;
  const viewport = useMemo(() => computeMapViewport(markers), [markers]);
  const positions = useMemo(() => markers.map(({ lat, lng }) => ({ lat, lng })), [markers]);

  if (!viewport) return null;

  return (
    <div
      className={cn("overflow-hidden rounded-2xl border border-border", className)}
      style={{ height }}
    >
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={viewport.center}
          defaultZoom={viewport.zoom}
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
          <FitBounds positions={positions} />
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={{ lat: marker.lat, lng: marker.lng }}
              onClick={() => navigate(journalEntryHref(marker.id, marker.entry_kind))}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
});

const OsmJournalEntriesMap = memo(function OsmJournalEntriesMap({
  markers,
  height = 360,
  className,
}: Props) {
  const mapUrl = useMemo(() => buildOsmStaticMapUrl(markers), [markers]);
  if (!mapUrl) return null;

  return (
    <div
      className={cn("overflow-hidden rounded-2xl border border-border", className)}
      style={{ height }}
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
  const { maxMarkers = 25, markers, ...rest } = props;
  const visible = markers.slice(0, maxMarkers);
  if (!visible.length) return null;

  if (getGoogleMapsApiKey()) return <GoogleJournalEntriesMap markers={visible} {...rest} />;
  return <OsmJournalEntriesMap markers={visible} {...rest} />;
}

export default memo(JournalEntriesMap);
