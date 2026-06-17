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

export function computeMapViewport(points: LatLng[]): MapViewport | null {
  if (!points.length) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats) - VIEWPORT_PAD;
  const maxLat = Math.max(...lats) + VIEWPORT_PAD;
  const minLng = Math.min(...lngs) - VIEWPORT_PAD;
  const maxLng = Math.max(...lngs) + VIEWPORT_PAD;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  const zoom = span > 8 ? 4 : span > 2 ? 6 : span > 0.5 ? 8 : span > 0.1 ? 10 : 12;
  return {
    center: { lat: centerLat, lng: centerLng },
    zoom,
    bounds: { north: maxLat, south: minLat, east: maxLng, west: minLng },
  };
}

export function buildOsmStaticMapUrl(points: LatLng[]): string | null {
  const viewport = computeMapViewport(points);
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
