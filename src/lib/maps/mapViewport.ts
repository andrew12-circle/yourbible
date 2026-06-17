export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewport {
  center: LatLng;
  zoom: number;
  bounds: MapBounds;
}

const VIEWPORT_PAD = 0.05;
const WORLD_VIEWPORT_PAD = 2;

export function computeMapViewport(points: LatLng[], options?: { worldView?: boolean }): MapViewport | null {
  if (!points.length) return null;
  const pad = options?.worldView ? WORLD_VIEWPORT_PAD : VIEWPORT_PAD;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  const zoom = options?.worldView
    ? span > 120
      ? 2
      : span > 60
        ? 3
        : span > 30
          ? 4
          : span > 12
            ? 5
            : span > 6
              ? 6
              : span > 2
                ? 8
                : span > 0.5
                  ? 10
                  : 12
    : span > 8
      ? 4
      : span > 2
        ? 6
        : span > 0.5
          ? 8
          : span > 0.1
            ? 10
            : 12;
  return {
    center: { lat: centerLat, lng: centerLng },
    zoom,
    bounds: { north: maxLat, south: minLat, east: maxLng, west: minLng },
  };
}

export function buildOsmStaticMapUrl(points: LatLng[], options?: { worldView?: boolean }): string | null {
  const viewport = computeMapViewport(points, options);
  if (!viewport) return null;
  const markers = points.map((p) => `${p.lat},${p.lng},red`).join("|");
  const params = new URLSearchParams({
    center: `${viewport.center.lat},${viewport.center.lng}`,
    zoom: String(viewport.zoom),
    size: "640x360",
    markers,
  });
  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
}
