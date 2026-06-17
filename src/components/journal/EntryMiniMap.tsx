import { memo, useMemo } from "react";
import { APIProvider, ControlPosition, Map, Marker } from "@vis.gl/react-google-maps";
import { ExternalLink, MapPin, Mountain } from "lucide-react";
import { getGoogleMapsApiKey, openInGoogleMapsUrl, streetViewMapsUrl } from "@/lib/maps/googleMaps";
import { cn } from "@/lib/utils";

interface Props {
  lat: number;
  lng: number;
  zoom?: number;
  height?: number;
  className?: string;
}

const OsmMiniMap = memo(function OsmMiniMap({ lat, lng, height = 240, className }: Props) {
  const d = 0.012;
  const src = useMemo(() => {
    const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  }, [lat, lng]);
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border", className)} style={{ height }}>
      <iframe title="Map" src={src} className="h-full w-full" style={{ border: 0 }} loading="lazy" />
    </div>
  );
});

const GoogleMiniMap = memo(function GoogleMiniMap({ lat, lng, zoom = 15, height = 240, className }: Props) {
  const apiKey = getGoogleMapsApiKey()!;
  const center = { lat, lng };

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border", className)} style={{ height }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
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
          <Marker position={center} />
        </Map>
      </APIProvider>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end gap-1 p-2">
        <a
          href={streetViewMapsUrl(lat, lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/95 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur hover:bg-muted"
          title="Open Street View in Google Maps"
        >
          <Mountain className="h-3 w-3" aria-hidden />
          Street View
        </a>
        <a
          href={openInGoogleMapsUrl(lat, lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/95 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur hover:bg-muted"
          title="Open in Google Maps"
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
          Open
        </a>
      </div>
    </div>
  );
});

/**
 * Journal entry map — Google Maps (satellite / roadmap / Street View) when
 * `VITE_GOOGLE_MAPS_API_KEY` is set; otherwise OpenStreetMap embed.
 */
function EntryMiniMap(props: Props) {
  if (getGoogleMapsApiKey()) return <GoogleMiniMap {...props} />;
  return <OsmMiniMap {...props} />;
}

export default memo(EntryMiniMap);

export function EntryMiniMapFallbackLabel() {
  if (getGoogleMapsApiKey()) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
      <MapPin className="h-3 w-3" aria-hidden />
      Add <code className="text-[10px]">VITE_GOOGLE_MAPS_API_KEY</code> for Google satellite &amp; Street View.
    </p>
  );
}
