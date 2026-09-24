import { useEffect, useRef, useState } from "react";
import { APIProvider, APILoadingStatus, Map, Marker, useApiLoadingStatus } from "@vis.gl/react-google-maps";
import type { PassageGeography } from "@/data/visualBible/geography";

type Props = { apiKey: string; scene: PassageGeography; mode: "satellite" | "3d"; showSites: boolean };
type ThreeDLibrary = {
  Map3DElement: new (options: { center: { lat: number; lng: number; altitude: number }; range: number; tilt: number; heading: number; mode: string }) => HTMLElement;
  Marker3DElement: new (options: { position: { lat: number; lng: number }; label: string; altitudeMode: string }) => HTMLElement;
};
function Globe({ scene, showSites, onFailure }: Pick<Props, "scene" | "showSites"> & { onFailure: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const globe = useRef<HTMLElement | null>(null);
  const [library, setLibrary] = useState<ThreeDLibrary | null>(null);
  const status = useApiLoadingStatus();
  useEffect(() => {
    if (status !== APILoadingStatus.LOADED) return;
    let disposed = false;
    void google.maps.importLibrary("maps3d").then(value => {
      if (!disposed) setLibrary(value as unknown as ThreeDLibrary);
    }).catch(() => { if (!disposed) onFailure(); });
    return () => { disposed = true; };
  }, [status, onFailure]);
  useEffect(() => {
    if (!library || !host.current) return;
    try {
      const map = new library.Map3DElement({ center: { ...scene.center, altitude: scene.cameraAltitude }, range: 4500, tilt: 55, heading: 260, mode: "HYBRID" });
      map.style.width = "100%"; map.style.height = "100%";
      map.addEventListener("gmp-error", onFailure);
      host.current.append(map); globe.current = map;
      return () => { map.removeEventListener("gmp-error", onFailure); map.remove(); globe.current = null; };
    } catch { onFailure(); }
  }, [library, scene, onFailure]);
  useEffect(() => {
    if (!library || !globe.current || !showSites) return;
    const markers = scene.sites.map(site => new library.Marker3DElement({ position: { lat: site.lat, lng: site.lng }, label: site.label, altitudeMode: "CLAMP_TO_GROUND" }));
    globe.current.append(...markers);
    return () => markers.forEach(marker => marker.remove());
  }, [library, scene, showSites]);
  return <div ref={host} className="h-full w-full" aria-label="Google 3D map of modern terrain" />;
}
function LoadingGuard({ onFailure }: { onFailure: () => void }) {
  const status = useApiLoadingStatus();
  useEffect(() => {
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) onFailure();
    if (status === APILoadingStatus.LOADED) return;
    const timer = window.setTimeout(onFailure, 20000);
    return () => window.clearTimeout(timer);
  }, [status, onFailure]);
  return null;
}
export default function GooglePassageMap({ apiKey, scene, mode, showSites }: Props) {
  const [failed, setFailed] = useState(false);
  const fail = useRef(() => setFailed(true)).current;
  if (failed) return <div role="status" className="flex h-full items-center justify-center p-5 text-center text-sm">Google’s map could not load. Check the connection or return to the passage images. API access and regional 3D coverage may vary.</div>;
  return <APIProvider apiKey={apiKey} onError={fail}>
    <LoadingGuard onFailure={fail} />
    {mode === "3d" ? <Globe scene={scene} showSites={showSites} onFailure={fail} /> :
      <Map defaultCenter={scene.center} defaultZoom={scene.zoom} mapTypeId="satellite" gestureHandling="cooperative" mapTypeControl={false} streetViewControl fullscreenControl={false} className="h-full w-full">
        {showSites ? scene.sites.map(site => <Marker key={site.id} position={{ lat: site.lat, lng: site.lng }} title={`${site.label} — ${site.precision}`} />) : null}
      </Map>}
  </APIProvider>;
}
