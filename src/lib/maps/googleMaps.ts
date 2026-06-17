/** Browser Google Maps key (Maps JavaScript API + Static Maps). */
export function getGoogleMapsApiKey(): string | null {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  return key || null;
}

export function googleMapsConfigured(): boolean {
  return Boolean(getGoogleMapsApiKey());
}

/** Open Google Maps Street View at a coordinate (works without embedding panorama). */
export function streetViewMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}

export function openInGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
