interface Props {
  lat: number;
  lng: number;
  zoom?: number;
  height?: number;
  className?: string;
}

/**
 * Embedded OpenStreetMap mini-map (no API key required). Uses the OSM export
 * iframe pattern with a small bbox around the point and a marker.
 */
export default function EntryMiniMap({ lat, lng, zoom = 14, height = 180, className = "" }: Props) {
  const d = 0.012; // ~1km bbox at mid latitudes
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div className={`overflow-hidden rounded-xl border border-border ${className}`} style={{ height }}>
      <iframe
        title="Map"
        src={src}
        className="w-full h-full"
        style={{ border: 0 }}
        loading="lazy"
      />
    </div>
  );
}
