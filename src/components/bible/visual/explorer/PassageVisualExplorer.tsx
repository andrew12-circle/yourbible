import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import type { BiblePlate } from "@/data/biblePlates/types";
import { BIBLE_PLATES } from "@/data/biblePlates";
import { KIND_LABELS, VISUAL_KINDS, type VisualAsset } from "@/data/visualBible/types";
import { geographyForPlate } from "@/data/visualBible/geography";
import { VISUAL_CATALOGUE } from "@/lib/visualBible/catalogue";
import { passageVisualChoices } from "@/lib/visualBible/passageChoices";
import { VisualImage } from "../VisualImage";
const GeographyView = lazy(() => import("./PassageGeographyView"));
const controls = "min-h-11 rounded-lg border bg-background px-3 text-xs disabled:opacity-40";
type Props = { plate: BiblePlate; onClose: () => void; assets?: readonly VisualAsset[] };
export default function PassageVisualExplorer({ plate, onClose, assets = VISUAL_CATALOGUE }: Props) {
  const labelId = useId();
  const select = useRef<HTMLSelectElement>(null);
  const choices = useMemo(() => passageVisualChoices(plate, assets, BIBLE_PLATES), [plate, assets]);
  const geography = geographyForPlate(plate.bookAbbr, plate.chapter, plate.beforeVerse, plate.kind);
  const ids = useMemo(() => [...choices.map(a => a.id), ...(geography ? ["geography"] : [])], [choices, geography]);
  const [selection, setSelection] = useState(() => choices[0]?.id ?? "geography");
  const [zoom, setZoom] = useState(false);
  const current = choices.find(a => a.id === selection);
  const index = ids.indexOf(selection);
  useEffect(() => { select.current?.focus(); }, []);
  const choose = (id: string) => { setSelection(id); setZoom(false); };
  const step = (direction: number) => { const next = index + direction; if (next >= 0 && next < ids.length) choose(ids[next]); };
  return <section className="absolute inset-0 z-20 flex min-h-0 min-w-0 flex-col gap-2 bg-background p-3 text-foreground sm:p-4" role="region" aria-label="Passage visual explorer" data-testid="passage-visual-explorer"
    onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
    onKeyDown={e => { e.stopPropagation(); if (e.key === "Escape") { e.preventDefault(); onClose(); } }}>
    <div className="flex shrink-0 items-center justify-between gap-2">
      <h3 id={labelId} className="text-left text-sm font-semibold">Explore this passage</h3>
      <button type="button" className={controls} onClick={onClose} aria-label="Close passage visuals">Close</button>
    </div>
    <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
      <button type="button" className={controls} disabled={index <= 0} onClick={() => step(-1)} aria-label="Previous visual">‹</button>
      <select ref={select} aria-label="Choose passage visual" value={selection} onChange={e => choose(e.target.value)} className="min-h-11 min-w-0 w-full rounded-lg border bg-background px-2 text-xs">
        {VISUAL_KINDS.map(kind => { const items = choices.filter(a => a.kind === kind); return items.length ? <optgroup key={kind} label={`${KIND_LABELS[kind]} (${items.length})`}>{items.map(asset => <option key={asset.id} value={asset.id}>{asset.title} · {asset.creator}</option>)}</optgroup> : null; })}
        {geography ? <optgroup label="Interactive geography"><option value="geography">Satellite / 3D · Google Earth links</option></optgroup> : null}
      </select>
      <button type="button" className={controls} disabled={index < 0 || index >= ids.length - 1} onClick={() => step(1)} aria-label="Next visual">›</button>
    </div>
    <p className="shrink-0 text-left text-[11px] text-muted-foreground" aria-live="polite">Visual {Math.max(1, index + 1)} of {ids.length} · {plate.referenceLabel} · Bible page stays in place</p>
    {current ? <>
      <div className="relative min-h-0 flex-1 overflow-auto rounded-lg bg-muted/20" tabIndex={0} aria-label="Selected visual; scroll to explore when enlarged">
        <div className="h-full" style={{ width: zoom ? "200%" : "100%", minHeight: zoom ? "200%" : "100%" }}>
          <VisualImage key={`${current.id}-${zoom}`} src={zoom ? current.detailUrl : current.readerUrl ?? current.detailUrl} alt={current.alt} detail />
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2"><p className="min-w-0 text-left text-sm font-medium" data-testid="selected-visual-title">{current.title}</p><button type="button" className={controls} onClick={() => setZoom(value => !value)}>{zoom ? "Fit image" : "Enlarge"}</button></div>
      <div className="max-h-[27%] shrink-0 overflow-y-auto text-left text-[11px] leading-relaxed" data-testid="selected-visual-source">
        <p>{current.creator} · {current.date} · {KIND_LABELS[current.kind]}</p>
        <p>{current.source.credit} · {current.source.license} · Resized, not cropped</p>
        <div className="flex flex-wrap gap-x-4">{current.source.url ? <a className="inline-flex min-h-11 items-center underline" href={current.source.url} target="_blank" rel="noopener noreferrer">Source record</a> : null}{current.source.licenseUrl ? <a className="inline-flex min-h-11 items-center underline" href={current.source.licenseUrl} target="_blank" rel="noopener noreferrer">Image license</a> : null}</div>
        <details key={current.id}><summary className="min-h-11 cursor-pointer py-3">About this visual and its connection</summary><p>{current.description}</p><p className="mt-2">{current.caution}</p>{current.passages.filter(p => p.book === plate.bookAbbr && p.chapter <= plate.chapter && (p.endChapter ?? p.chapter) >= plate.chapter).map((p, n) => <p key={n} className="mt-2">{p.note}</p>)}</details>
      </div>
    </> : geography && selection === "geography" ? <div className="min-h-0 flex-1 overflow-y-auto text-left"><Suspense fallback={<p role="status">Opening geography…</p>}><GeographyView scene={geography} /></Suspense></div> : <p>No reviewed visuals are available for this passage.</p>}
  </section>;
}
