import { lazy, Suspense, useEffect, useState } from "react";
import { earthSceneUrl, GEOGRAPHY_CREDIT, GEOGRAPHY_LICENSE, type PassageGeography } from "@/data/visualBible/geography";
import { getGoogleMapsApiKey, openInGoogleMapsUrl } from "@/lib/maps/googleMaps";
const GooglePassageMap = lazy(() => import("./GooglePassageMap"));
const button = "min-h-11 rounded-lg border px-3 text-xs disabled:opacity-50";
export default function PassageGeographyView({ scene }: { scene: PassageGeography }) {
  const apiKey = getGoogleMapsApiKey();
  const allow3D = import.meta.env.VITE_BIBLE_GOOGLE_3D_ENABLED === "true";
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"satellite" | "3d">("satellite");
  const [showSites, setShowSites] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  return <div className="flex h-full min-h-0 flex-col gap-2" data-testid="passage-geography">
    <p className="text-xs font-medium">Modern terrain · not a view of the first century</p>
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <button type="button" className={button} aria-pressed={mode === "satellite"} onClick={() => setMode("satellite")}>Satellite</button>
      <button type="button" className={button} disabled={!allow3D} title={allow3D ? "Explore modern terrain in 3D" : "3D needs Google Maps 3D configuration"} aria-pressed={mode === "3d"} onClick={() => setMode("3d")}>3D terrain</button>
      <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={showSites} onChange={e => setShowSites(e.target.checked)} />Reference places</label>
    </div>
    <div className="relative min-h-[200px] flex-1 overflow-hidden rounded-lg border bg-muted/20">
      {!online ? <p role="status" className="p-5 text-sm">Satellite and 3D views need internet. Previously cached licensed images and atlas pages can still be viewed.</p> : !apiKey ?
        <p role="status" className="p-5 text-sm">The in-page Google connection is not configured on this build. Use the Earth link below, or switch back to images and maps.</p> : !loaded ?
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-xs"><p>Loading this view connects to Google. Its own attribution stays visible; map tiles are not saved in the Bible’s offline library.</p><button type="button" className={button} onClick={() => setLoaded(true)}>Load Google map</button></div> :
          <Suspense fallback={<p role="status" className="p-4 text-sm">Loading map…</p>}><GooglePassageMap key={mode} apiKey={apiKey} scene={scene} mode={mode} showSites={showSites} /></Suspense>}
    </div>
    <div className="max-h-40 shrink-0 overflow-y-auto text-[11px] leading-relaxed">
      <div className="flex flex-wrap gap-x-4">
        <a className="inline-flex min-h-11 items-center underline" href={earthSceneUrl(scene)} target="_blank" rel="noopener noreferrer">Open Google Earth ↗</a>
        <a className="inline-flex min-h-11 items-center underline" href={openInGoogleMapsUrl(scene.center.lat, scene.center.lng)} target="_blank" rel="noopener noreferrer">Open Google Maps ↗</a>
      </div>
      <details><summary className="min-h-11 cursor-pointer py-3">Sources and historical context</summary>
        <p>{scene.caution}</p>
        {scene.sites.map(site => <p key={site.id} className="mt-2"><a className="underline" href={site.sourceUrl} target="_blank" rel="noopener noreferrer">{site.label}</a> · {site.precision}. {site.note}</p>)}
        <p className="mt-2">{GEOGRAPHY_CREDIT} <a className="underline" href={GEOGRAPHY_LICENSE} target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap attribution</a></p>
        <p className="mt-2"><a className="underline" href="https://www.openbible.info/geo/overlays/" target="_blank" rel="noopener noreferrer">Explore historical Jerusalem overlays at their source ↗</a>. Their image permissions are separate; this app links to them rather than copying them. Google Earth’s historical imagery is not a reconstruction of biblical times.</p>
      </details>
    </div>
  </div>;
}
