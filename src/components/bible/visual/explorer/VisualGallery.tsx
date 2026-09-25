import { useState } from "react";
import { Bookmark, ImageOff, ArrowUpRight } from "lucide-react";
import { KIND_LABELS, type VisualAsset } from "@/data/visualBible/types";
import { passageLabel } from "@/lib/visualBible/query";
export const galleryGrid = "grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))]";
export const explorerButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";
export function VisualPreview({ asset, detail = false }: { asset: VisualAsset; detail?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="flex h-full min-h-40 items-center justify-center gap-2 p-4 text-xs text-muted-foreground"><ImageOff className="h-5 w-5" />Open to view or retry image</span> : <img src={detail ? asset.readerUrl ?? asset.detailUrl : asset.thumbnailUrl} alt={asset.alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-contain p-3 transition-transform duration-300 motion-safe:group-hover:scale-[1.025]" />;
}
export function VisualGallery({ assets, saved, onSave, onSelect }: {
  assets: readonly VisualAsset[]; saved: readonly string[]; onSave: (id: string) => void;
  onSelect: (asset: VisualAsset, element: HTMLElement) => void;
}) {
  return <div className={galleryGrid} data-testid="explorer-art-grid">{assets.map(asset => <article key={asset.id} className="group min-w-0 overflow-hidden rounded-2xl border bg-card text-card-foreground" data-visual-id={asset.id}>
    <button type="button" onClick={event => onSelect(asset, event.currentTarget)} aria-label={`View ${asset.title}`} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
      <div className="aspect-[4/3] bg-muted/40"><VisualPreview asset={asset} /></div>
      <div className="space-y-2 px-4 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{asset.iconic ? "Collection highlight" : KIND_LABELS[asset.kind]}</p>
        <h3 className="font-serif text-xl leading-snug">{asset.title}</h3>
        <p className="text-xs text-muted-foreground">{asset.creator}</p>
        <p className="text-xs leading-relaxed">{asset.passages.slice(0, 2).map(passageLabel).join(" · ")}</p>
      </div>
    </button>
    <div className="mt-3 flex items-center justify-between gap-2 border-t px-4 py-2">
      <span className="min-w-0 text-[10px] text-muted-foreground">{asset.source.license}{asset.review === "legacy" ? " · review pending" : ""}</span>
      <button type="button" aria-label={`${saved.includes(`visual:${asset.id}`) ? "Unsave" : "Save"} ${asset.title}`} aria-pressed={saved.includes(`visual:${asset.id}`)} onClick={() => onSave(`visual:${asset.id}`)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><Bookmark className="h-4 w-4" fill={saved.includes(`visual:${asset.id}`) ? "currentColor" : "none"} /></button>
    </div>
  </article>)}</div>;
}
export function FeaturedVisual({ asset, onSelect }: { asset: VisualAsset; onSelect: (asset: VisualAsset, element: HTMLElement) => void }) {
  return <button type="button" className="group mb-6 grid w-full overflow-hidden rounded-2xl border bg-card text-left focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" aria-label={`Featured visual: ${asset.title}`} onClick={event => onSelect(asset, event.currentTarget)}>
    <div className="h-60 min-w-0 bg-muted/40 md:h-72"><VisualPreview asset={asset} /></div>
    <div className="flex min-w-0 flex-col justify-center gap-3 p-5 md:p-7"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Selected for this passage</p><h3 className="font-serif text-2xl leading-tight md:text-3xl">{asset.title}</h3><p className="text-sm text-muted-foreground">{asset.creator} · {asset.date}</p><p className="line-clamp-3 text-sm leading-relaxed">{asset.description}</p><span className="mt-1 inline-flex items-center gap-2 text-sm font-medium">Look closer <ArrowUpRight className="h-4 w-4" /></span><span className="text-[10px] text-muted-foreground">{asset.source.credit} · {asset.source.license}</span></div>
  </button>;
}
