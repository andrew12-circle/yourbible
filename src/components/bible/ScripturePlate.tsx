import { lazy, Suspense, useMemo, useRef, useState } from "react";
import type { BiblePlate } from "@/lib/bible/biblePlates";
import { BIBLE_PLATES } from "@/data/biblePlates";
import { biblePlateAssetUrl } from "@/lib/bible/biblePlateAssets";
import { VISUAL_CATALOGUE } from "@/lib/visualBible/catalogue";
import { passageVisualChoices } from "@/lib/visualBible/passageChoices";
import { geographyForPlate } from "@/data/visualBible/geography";
import { KIND_LABELS, type VisualAsset } from "@/data/visualBible/types";
import { cn } from "@/lib/utils";
import { VisualImage } from "./visual/VisualImage";
import { VisualExplorerBoundary } from "./visual/explorer/VisualExplorerBoundary";
const PassageVisualExplorer = lazy(() => import("./visual/explorer/PassageVisualExplorer"));
const GeographyView = lazy(() => import("./visual/explorer/PassageGeographyView"));

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
function AssetCaption({ asset, referenceLabel }: { asset: VisualAsset; referenceLabel: string }) {
  return <figcaption className="scripture-plate-caption shrink-0">
    <span className="scripture-plate-title">{asset.title}</span><span className="scripture-plate-ref"> {referenceLabel}</span>
    <span className="scripture-plate-artist block text-[0.85em] opacity-80 mt-0.5">{asset.creator} · {KIND_LABELS[asset.kind]}{asset.source.url ? <> · <a href={asset.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-100">Source</a></> : null}</span>
    <span className="block mt-1 text-[0.75em] leading-snug opacity-80">{asset.source.credit} · {asset.source.license}{asset.source.licenseUrl ? <> · <a href={asset.source.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">License</a></> : null}</span>
  </figcaption>;
}
function Plate({ plate, compact = false }: Props) {
  const src = biblePlateAssetUrl(plate);
  const [exploring, setExploring] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const choices = useMemo(() => passageVisualChoices(plate, VISUAL_CATALOGUE, BIBLE_PLATES), [plate]);
  const geography = useMemo(() => geographyForPlate(plate.bookAbbr, plate.chapter, plate.beforeVerse, plate.kind), [plate]);
  const ids = useMemo(() => [...choices.map(asset => asset.id), ...(geography ? ["geography"] : [])], [choices, geography]);
  const originalId = plate.visualAssetId ?? `plate-${plate.id}`;
  const originalIndex = Math.max(0, ids.indexOf(originalId));
  const [quickIndex, setQuickIndex] = useState(originalIndex);
  const quickId = ids[quickIndex] ?? ids[0];
  const current = choices.find(asset => asset.id === quickId);
  const showingOriginal = quickId === originalId || (!current && quickId !== "geography");
  const canCycle = ids.length > 1;
  const stepQuick = (direction: number) => {
    if (!ids.length) return;
    setQuickIndex(index => (index + direction + ids.length) % ids.length);
  };
  const close = () => { setExploring(false); window.requestAnimationFrame(() => opener.current?.focus()); };
  return <figure data-reader-plate={plate.id} data-reader-artist={current?.creator ?? plate.artist} data-reader-visual-kind={current?.kind ?? (quickId === "geography" ? "geography" : plate.kind ?? "artwork")} data-reader-visual-id={quickId ?? plate.visualAssetId} className={cn("scripture-plate relative", compact ? "scripture-plate--compact" : "h-full min-h-0 flex flex-col")}>
    <div className={cn("scripture-plate-image-wrap", exploring && "invisible", compact ? "relative w-full" : "relative flex-1 min-h-0 flex items-center justify-center")} aria-hidden={exploring || undefined} style={compact ? { aspectRatio: "4 / 3" } : undefined}>
      {quickId === "geography" && geography ? <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Opening map…</div>}><GeographyView scene={geography} /></Suspense>
        : showingOriginal ? <PlateImage key={src} src={src} alt={plate.alt} />
        : current ? <VisualImage key={current.id} src={current.readerUrl ?? current.detailUrl} alt={current.alt} detail /> : <PlateImage key={src} src={src} alt={plate.alt} />}
      {canCycle && !exploring ? <>
        <button type="button" aria-label="Previous passage visual" className="absolute left-1 top-1/2 z-10 flex h-12 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/10 bg-background/25 text-3xl font-light text-foreground/35 opacity-60 backdrop-blur-[1px] transition hover:bg-background/70 hover:text-foreground/80 hover:opacity-100 focus-visible:bg-background/80 focus-visible:text-foreground" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); stepQuick(-1); }}>‹</button>
        <button type="button" aria-label="Next passage visual" className="absolute right-1 top-1/2 z-10 flex h-12 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/10 bg-background/25 text-3xl font-light text-foreground/35 opacity-60 backdrop-blur-[1px] transition hover:bg-background/70 hover:text-foreground/80 hover:opacity-100 focus-visible:bg-background/80 focus-visible:text-foreground" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); stepQuick(1); }}>›</button>
        <span className="pointer-events-none absolute bottom-1 right-2 rounded-full bg-background/55 px-2 py-0.5 text-[10px] text-foreground/50 backdrop-blur-sm">{quickIndex + 1}/{ids.length}</span>
      </> : null}
    </div>
    {!exploring ? current && !showingOriginal ? <AssetCaption asset={current} referenceLabel={plate.referenceLabel} /> : quickId === "geography" && geography ? <figcaption className="scripture-plate-caption shrink-0"><span className="scripture-plate-title">{geography.title}</span><span className="scripture-plate-ref"> {plate.referenceLabel}</span><span className="block mt-0.5 text-[0.8em] opacity-80">Interactive geography · Map / Satellite / 3D / Google Earth</span></figcaption> : <figcaption className="scripture-plate-caption shrink-0">
      <span className="scripture-plate-title">{plate.title}</span><span className="scripture-plate-ref"> {plate.referenceLabel}</span>
      {plate.artist ? <span className="scripture-plate-artist block text-[0.85em] opacity-80 mt-0.5">{plate.artist}{plate.sourceUrl ? <> · <a href={plate.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-100">Source</a></> : null}</span> : null}
      {plate.context ? <span className="block mt-1 text-[0.75em] leading-snug"><span className="block font-medium">{plate.context.label}</span><span className="block">{plate.context.note}</span><span className="block mt-1 opacity-80">{plate.context.credit} · {plate.context.licenseLabel}{plate.context.licenseUrl ? <> · <a href={plate.context.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">License</a></> : null} · Resized for the reader</span></span> : null}
    </figcaption> : null}
    <button ref={opener} type="button" className={cn("absolute right-2 top-2 z-10 min-h-11 rounded-full border bg-background/95 px-3 text-xs font-medium text-foreground shadow-sm", exploring && "invisible")} aria-hidden={exploring || undefined} onPointerDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setExploring(true); }} aria-label="Explore this passage">Explore this passage</button>
    {exploring ? <VisualExplorerBoundary onClose={close}><Suspense fallback={<div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background p-4" role="status">Opening passage visuals…<button type="button" className="min-h-11 rounded border px-3" onClick={close}>Cancel</button></div>}><PassageVisualExplorer plate={plate} onClose={close} /></Suspense></VisualExplorerBoundary> : null}
  </figure>;
}
