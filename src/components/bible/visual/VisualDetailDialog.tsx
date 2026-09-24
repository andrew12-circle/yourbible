import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KIND_LABELS, RELATIONSHIP_LABELS, type VisualAsset } from "@/data/visualBible/types";
import { passageLabel } from "@/lib/visualBible/query";
import { VisualImage } from "./VisualImage";

type Props = { asset: VisualAsset; onClose: () => void; returnFocus: HTMLElement | null; onNavigate?: () => void };
export function VisualDetailDialog({ asset, onClose, returnFocus, onNavigate }: Props) {
  const [zoom, setZoom] = useState(1);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-w-6xl p-4 sm:p-6" onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus?.isConnected) returnFocus.focus(); }}>
      <DialogHeader className="pr-8 text-left">
        <DialogTitle className="font-serif text-xl">{asset.title}</DialogTitle>
        <DialogDescription>{asset.creator} · {asset.date} · {asset.technique || KIND_LABELS[asset.kind]}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap items-center gap-2" aria-label="Image magnification">
        <button type="button" className="min-h-11 rounded border px-3" disabled={zoom === 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))}>Zoom out</button>
        <button type="button" className="min-h-11 rounded border px-3" disabled={zoom === 6} onClick={() => setZoom(value => Math.min(6, value + 0.5))}>Zoom in</button>
        <button type="button" className="min-h-11 rounded border px-3" onClick={() => setZoom(1)}>Fit image</button>
        <span aria-live="polite" className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
      </div>
      <div className="max-h-[65dvh] overflow-auto rounded-lg border bg-muted/30" tabIndex={0} role="region" aria-label="Zoomable image; scroll to explore at larger sizes">
        <div style={{ width: `${zoom * 100}%`, height: `${zoom * 52}dvh` }}><VisualImage src={asset.detailUrl} alt={asset.alt} detail /></div>
      </div>
      <div className="space-y-4 text-sm">
        <p>{asset.description}</p>
        <div className="rounded-lg border bg-muted/30 p-3"><h3 className="mb-1 font-semibold">How to read this visual</h3><p>{asset.caution}</p></div>
        <section><h3 className="mb-2 font-semibold">Scripture connections</h3>
          <ul className="space-y-3">{asset.passages.map((passage, index) => <li key={`${passage.book}-${passage.chapter}-${index}`}>
            <Link to={`/read/${encodeURIComponent(passage.book)}/${passage.chapter}${passage.verse ? `?v=${passage.verse}` : ""}`} className="inline-flex min-h-11 items-center underline underline-offset-2" onClick={() => { onClose(); onNavigate?.(); }}>{passageLabel(passage)}</Link>
            <span className="ml-2 text-xs text-muted-foreground">{RELATIONSHIP_LABELS[passage.relationship]}</span>
            <p className="text-muted-foreground">{passage.note}</p>
          </li>)}</ul>
        </section>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 break-words">
          {asset.holdingCollection ? <><dt className="text-muted-foreground">Museum / site</dt><dd>{asset.holdingCollection}</dd></> : null}
          {asset.period ? <><dt className="text-muted-foreground">Period / tradition</dt><dd>{asset.period}</dd></> : null}
          <dt className="text-muted-foreground">Culture / region</dt><dd>{asset.culture}</dd>
          <dt className="text-muted-foreground">Medium</dt><dd>{asset.medium}</dd>
          <dt className="text-muted-foreground">Image source</dt><dd>{asset.source.name}</dd>
          {asset.source.objectId ? <><dt className="text-muted-foreground">Source identifier</dt><dd>{asset.source.objectId}</dd></> : null}
          {asset.sourceDimensions ? <><dt className="text-muted-foreground">Source pixels</dt><dd>{asset.sourceDimensions.width.toLocaleString()} × {asset.sourceDimensions.height.toLocaleString()}</dd></> : null}
          <dt className="text-muted-foreground">Record status</dt><dd>{asset.review === "legacy" ? "Legacy record — review pending" : asset.review === "original" ? "Original study diagram" : `Source checked ${asset.source.checkedOn ?? ""}; passage links are editorial`}</dd>
        </dl>
        <section className="space-y-2 border-t pt-3"><h3 className="font-semibold">Source and image rights</h3>
          <p>{asset.source.credit}</p>
          {asset.source.photographer ? <p>Photograph: {asset.source.photographer}</p> : null}
          <p>{asset.source.license}{asset.source.licenseUrl ? <> · <a className="underline" href={asset.source.licenseUrl} target="_blank" rel="noopener noreferrer">License terms</a></> : null}</p>
          {asset.source.rightsNote ? <p className="text-xs text-muted-foreground">{asset.source.rightsNote}</p> : null}
          {asset.source.url ? <a className="inline-flex min-h-11 items-center underline" href={asset.source.url} target={asset.source.url.startsWith("https:") ? "_blank" : undefined} rel="noopener noreferrer">Original source record</a> : <p>Source record not yet catalogued.</p>}
          {asset.source.objectUrl ? <a className="ml-4 inline-flex min-h-11 items-center underline" href={asset.source.objectUrl} target="_blank" rel="noopener noreferrer">Object research</a> : null}
          <p className="text-xs text-muted-foreground">{asset.review === "original" ? "Original diagram; no historical-image claim." : "Reader derivatives are resized and converted to WebP without cropping or AI restoration. Earlier changes made by the source photographer or restorer are not reversed. Photograph rights are separate from the age of the depicted object. Source institutions do not endorse our Scripture connections."}</p>
        </section>
      </div>
    </DialogContent>
  </Dialog>;
}
