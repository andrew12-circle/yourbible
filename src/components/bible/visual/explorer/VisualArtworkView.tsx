import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { KIND_LABELS, RELATIONSHIP_LABELS, type VisualAsset } from "@/data/visualBible/types";
import { passageLabel } from "@/lib/visualBible/query";
import type { GeographyPlace } from "@/lib/bible/geography";
import { VisualImage } from "../VisualImage";
import { PlaceLinks } from "./VisualPlacesView";
import { explorerButton } from "./VisualGallery";

type Props = {
  asset: VisualAsset; index: number; total: number; onBack: () => void; onStep: (step: number) => void;
  saved: boolean; onSave: () => void; onNavigate?: () => void; places: GeographyPlace[];
};
export function VisualArtworkView({ asset, index, total, onBack, onStep, saved, onSave, onNavigate, places }: Props) {
  const [zoom, setZoom] = useState(1);
  return <section aria-label="Artwork viewer" className="space-y-4" onKeyDown={event => {
    if ((event.target as HTMLElement).closest("input,select,textarea,button,a")) return;
    if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); event.stopPropagation(); onStep(-1); }
    if (event.key === "ArrowRight" && index >= 0 && index < total - 1) { event.preventDefault(); event.stopPropagation(); onStep(1); }
  }}>
    <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" className={explorerButton} onClick={onBack} autoFocus><ArrowLeft className="h-4 w-4" />Back to gallery</button><div className="flex items-center gap-2" aria-label="Gallery navigation"><button type="button" className={explorerButton} aria-label="Previous artwork" disabled={index <= 0} onClick={() => onStep(-1)}><ChevronLeft className="h-4 w-4" /></button><span className="text-xs text-muted-foreground">{index >= 0 ? `${index + 1} of ${total}` : "Saved selection"}</span><button type="button" className={explorerButton} aria-label="Next artwork" disabled={index < 0 || index >= total - 1} onClick={() => onStep(1)}><ChevronRight className="h-4 w-4" /></button></div></div>
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
      <div className="min-w-0 space-y-3">
        <div className="h-[42dvh] min-h-56 overflow-auto rounded-2xl border bg-muted/30 xl:h-[60dvh]" tabIndex={0} role="region" aria-label="Artwork image; arrow keys browse, scroll to explore when zoomed">
          <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}><VisualImage src={asset.detailUrl} alt={asset.alt} detail /></div>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Image magnification"><button type="button" className={explorerButton} disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button><button type="button" className={explorerButton} disabled={zoom >= 4} onClick={() => setZoom(value => Math.min(4, value + 0.5))} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button><button type="button" className={explorerButton} onClick={() => setZoom(1)}>Fit image</button><span className="text-xs" aria-live="polite">{Math.round(zoom * 100)}%</span></div>
        <p className="text-xs leading-relaxed text-muted-foreground">{asset.source.credit} · {asset.source.license}</p>
      </div>
      <div className="min-w-0 space-y-5">
        <header><p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{asset.technique || KIND_LABELS[asset.kind]}</p><h2 className="font-serif text-2xl leading-tight md:text-3xl">{asset.title}</h2><p className="mt-2 text-sm text-muted-foreground">{asset.creator} · {asset.date}</p></header>
        <button type="button" className={explorerButton} aria-pressed={saved} onClick={onSave}><Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />{saved ? "Saved on this device" : "Save to my collection"}</button>
        <p className="text-sm leading-relaxed">{asset.description}</p>
        <div className="rounded-xl bg-muted/40 p-4 text-xs leading-relaxed"><h3 className="mb-1 font-semibold">How this relates to Scripture</h3><p>{asset.caution}</p></div>
        {places.map(place => <section key={place.id} className="space-y-2 rounded-xl border p-3"><h3 className="text-sm font-semibold">Explore {place.name}</h3><p className="text-xs text-muted-foreground">Modern site reference, not the precise viewpoint of this image. Compare identifications in Places on Earth.</p>{place.candidates[0] && <PlaceLinks candidate={place.candidates[0]} />}</section>)}
        <section className="space-y-2"><h3 className="text-sm font-semibold">Scripture connections</h3>{asset.passages.map((passage, i) => <div key={i} className="border-b pb-3 text-xs leading-relaxed"><Link onClick={onNavigate} to={`/read/${encodeURIComponent(passage.book)}/${passage.chapter}${passage.verse ? `?v=${passage.verse}` : ""}`} className="inline-flex min-h-10 items-center font-medium underline underline-offset-4">{passageLabel(passage)}</Link><p className="text-muted-foreground">{RELATIONSHIP_LABELS[passage.relationship]} · {passage.note}</p></div>)}</section>
        <details className="text-xs leading-relaxed"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Object details & source rights</summary><dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 break-words"><dt>Culture</dt><dd>{asset.culture}</dd><dt>Medium</dt><dd>{asset.medium}</dd>{asset.holdingCollection && <><dt>Collection</dt><dd>{asset.holdingCollection}</dd></>}{asset.period && <><dt>Period</dt><dd>{asset.period}</dd></>}<dt>Record</dt><dd>{asset.review === "legacy" ? "Inherited record; review pending" : asset.review === "original" ? "Original study diagram" : `Source checked ${asset.source.checkedOn ?? ""}; passage links are editorial`}</dd>{asset.sourceDimensions && <><dt>Source pixels</dt><dd>{asset.sourceDimensions.width} × {asset.sourceDimensions.height}</dd></>}</dl><p className="mt-3">{asset.source.credit}</p>{asset.source.photographer && <p>Photograph: {asset.source.photographer}</p>}<p>{asset.source.license}</p>{asset.source.rightsNote && <p className="mt-2">{asset.source.rightsNote}</p>}<div className="flex flex-wrap gap-3">{asset.source.url && <a href={asset.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Original source record</a>}{asset.source.licenseUrl && <a href={asset.source.licenseUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">License terms</a>}{asset.source.objectUrl && <a href={asset.source.objectUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Object research</a>}</div><p>Reader derivatives are resized without cropping or AI restoration. Photograph rights are separate from the age of the object. Source institutions do not endorse these Scripture connections.</p></details>
      </div>
    </div>
  </section>;
}
