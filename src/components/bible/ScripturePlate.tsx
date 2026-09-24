import { lazy, Suspense, useRef, useState } from "react";
import type { BiblePlate } from "@/lib/bible/biblePlates";
import { biblePlateAssetUrl } from "@/lib/bible/biblePlateAssets";
import { cn } from "@/lib/utils";
import { VisualExplorerBoundary } from "./visual/explorer/VisualExplorerBoundary";
const PassageVisualExplorer = lazy(() => import("./visual/explorer/PassageVisualExplorer"));

type Props = { plate: BiblePlate; compact?: boolean };
function PlateImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (failed) return <div className="scripture-plate-fallback flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground" role="status">
    <span>Illustration unavailable</span><button type="button" className="min-h-11 rounded border px-4 py-2 underline underline-offset-2" onClick={() => { setAttempt(n => n + 1); setFailed(false); }}>Retry illustration</button>
  </div>;
  return <img key={attempt} src={attempt ? `${src}?retry=${attempt}` : src} alt={alt} className="scripture-plate-image" loading="eager" decoding="async" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={() => setFailed(true)} />;
}
export function ScripturePlate({ plate, compact = false }: Props) {
  return <Plate key={plate.id} plate={plate} compact={compact} />;
}
function Plate({ plate, compact = false }: Props) {
  const src = biblePlateAssetUrl(plate);
  const [exploring, setExploring] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = () => { setExploring(false); window.requestAnimationFrame(() => opener.current?.focus()); };
  return <figure data-reader-plate={plate.id} data-reader-artist={plate.artist} data-reader-visual-kind={plate.kind ?? "artwork"} data-reader-visual-id={plate.visualAssetId} className={cn("scripture-plate relative", compact ? "scripture-plate--compact" : "h-full min-h-0 flex flex-col")}>
    <div className={cn("scripture-plate-image-wrap", exploring && "invisible", compact ? "relative w-full" : "relative flex-1 min-h-0 flex items-center justify-center")} aria-hidden={exploring || undefined} style={compact ? { aspectRatio: "4 / 3" } : undefined}>
      <PlateImage key={src} src={src} alt={plate.alt} />
    </div>
    <figcaption className={cn("scripture-plate-caption shrink-0", exploring && "invisible")} aria-hidden={exploring || undefined}>
      <span className="scripture-plate-title">{plate.title}</span><span className="scripture-plate-ref"> {plate.referenceLabel}</span>
      {plate.artist ? <span className="scripture-plate-artist block text-[0.85em] opacity-80 mt-0.5">{plate.artist}{plate.sourceUrl ? <> · <a href={plate.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-100">Source</a></> : null}</span> : null}
      {plate.context ? <span className="block mt-1 text-[0.75em] leading-snug"><span className="block font-medium">{plate.context.label}</span><span className="block">{plate.context.note}</span><span className="block mt-1 opacity-80">{plate.context.credit} · {plate.context.licenseLabel}{plate.context.licenseUrl ? <> · <a href={plate.context.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">License</a></> : null} · Resized for the reader</span></span> : null}
    </figcaption>
    <button ref={opener} type="button" className={cn("absolute right-2 top-2 z-10 min-h-11 rounded-full border bg-background/95 px-3 text-xs font-medium text-foreground shadow-sm", exploring && "invisible")} aria-hidden={exploring || undefined} onPointerDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setExploring(true); }} aria-label="Explore this passage">Explore this passage</button>
    {exploring ? <VisualExplorerBoundary onClose={close}><Suspense fallback={<div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background p-4" role="status">Opening passage visuals…<button type="button" className="min-h-11 rounded border px-3" onClick={close}>Cancel</button></div>}><PassageVisualExplorer plate={plate} onClose={close} /></Suspense></VisualExplorerBoundary> : null}
  </figure>;
}
