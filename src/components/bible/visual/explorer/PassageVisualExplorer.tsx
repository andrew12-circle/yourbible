import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, X } from "lucide-react";
import type { BiblePlate } from "@/data/biblePlates/types";
import { BIBLE_PLATES } from "@/data/biblePlates";
import { KIND_LABELS, VISUAL_KINDS, type VisualAsset } from "@/data/visualBible/types";
import { geographyForPlate } from "@/data/visualBible/geography";
import { biblePlateAssetUrl } from "@/lib/bible/biblePlateAssets";
import { VISUAL_CATALOGUE } from "@/lib/visualBible/catalogue";
import { passageVisualChoices } from "@/lib/visualBible/passageChoices";
import { VisualImage } from "../VisualImage";

const GeographyView = lazy(() => import("./PassageGeographyView"));
const controls = "inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-35";

type Props = {
  plate: BiblePlate;
  onClose: () => void;
  assets?: readonly VisualAsset[];
  initialSelection?: string;
};

const galleryTheme = {
  "--background": "0 0% 100%",
  "--foreground": "222.2 47.4% 11.2%",
  "--card": "0 0% 100%",
  "--card-foreground": "222.2 47.4% 11.2%",
  "--muted": "210 40% 96.1%",
  "--muted-foreground": "215.4 16.3% 46.9%",
  "--border": "214.3 31.8% 91.4%",
  "--primary": "222.2 47.4% 11.2%",
  "--primary-foreground": "210 40% 98%",
} as CSSProperties;

export default function PassageVisualExplorer({ plate, onClose, assets = VISUAL_CATALOGUE, initialSelection }: Props) {
  const choices = useMemo(() => passageVisualChoices(plate, assets, BIBLE_PLATES), [plate, assets]);
  const geography = geographyForPlate(plate.bookAbbr, plate.chapter, plate.beforeVerse, plate.kind);
  const originalId = plate.visualAssetId ?? `plate-${plate.id}`;
  const originalIsCatalogued = choices.some(asset => asset.id === originalId);
  const ids = useMemo(
    () => [...(!originalIsCatalogued ? [originalId] : []), ...choices.map(asset => asset.id), ...(geography ? ["geography"] : [])],
    [choices, geography, originalId, originalIsCatalogued],
  );
  const startingId = initialSelection && ids.includes(initialSelection) ? initialSelection : ids[0] ?? "geography";
  const [selection, setSelection] = useState(startingId);
  const [zoom, setZoom] = useState(1);
  const touchStart = useRef<number | null>(null);
  const current = choices.find(asset => asset.id === selection);
  const showingOriginal = selection === originalId && !current;
  const index = Math.max(0, ids.indexOf(selection));
  const imageSrc = showingOriginal ? biblePlateAssetUrl(plate) : current ? current.detailUrl : "";
  const imageAlt = showingOriginal ? plate.alt : current?.alt ?? "";

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const choose = (id: string) => {
    setSelection(id);
    setZoom(1);
  };
  const step = (direction: number) => {
    if (!ids.length) return;
    choose(ids[(index + direction + ids.length) % ids.length]);
  };
  const setMagnification = (next: number) => setZoom(Math.max(1, Math.min(4, next)));

  const viewer = <section
    className="fixed inset-0 z-[400] flex h-[100dvh] w-screen min-h-0 min-w-0 flex-col overflow-hidden bg-white text-slate-950"
    style={galleryTheme}
    role="dialog"
    aria-modal="true"
    aria-label="Passage artwork viewer"
    data-testid="passage-visual-explorer"
    onPointerDown={event => event.stopPropagation()}
    onClick={event => event.stopPropagation()}
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
      if (event.key === "+" || event.key === "=") { event.preventDefault(); setMagnification(zoom + 0.5); }
      if (event.key === "-") { event.preventDefault(); setMagnification(zoom - 0.5); }
    }}
    onTouchStart={event => { event.stopPropagation(); touchStart.current = event.touches[0]?.clientX ?? null; }}
    onTouchEnd={event => {
      event.stopPropagation();
      const start = touchStart.current;
      touchStart.current = null;
      if (start == null) return;
      const delta = (event.changedTouches[0]?.clientX ?? start) - start;
      if (Math.abs(delta) > 55) step(delta > 0 ? -1 : 1);
    }}
  >
    <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur md:px-5">
      <div className="min-w-0">
        <p className="truncate font-serif text-base font-semibold md:text-lg">{plate.referenceLabel}</p>
        <p className="truncate text-[11px] text-slate-500">
          {showingOriginal ? plate.title : current ? `${current.title} · ${current.creator}` : "Interactive geography"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-xs tabular-nums text-slate-500 sm:inline">{index + 1} of {ids.length}</span>
        <button type="button" className={controls} onClick={onClose} aria-label="Close full-screen artwork"><X className="h-4 w-4" /><span className="hidden sm:inline">Close</span></button>
      </div>
    </header>

    <div className="relative min-h-0 flex-1 bg-[radial-gradient(circle_at_center,_#f8fafc_0%,_#ffffff_58%,_#f8fafc_100%)]">
      {selection === "geography" && geography ? (
        <div className="h-full overflow-y-auto p-3 md:p-6">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-slate-500">Opening geography…</div>}>
            <GeographyView scene={geography} />
          </Suspense>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => step(-1)} aria-label="Previous artwork" className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-800 shadow-lg backdrop-blur transition hover:bg-white md:left-5"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => step(1)} aria-label="Next artwork" className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-800 shadow-lg backdrop-blur transition hover:bg-white md:right-5"><ChevronRight className="h-5 w-5" /></button>
          <div className="h-full overflow-auto overscroll-contain p-3 sm:p-5 md:p-7" tabIndex={0} aria-label="Artwork detail area; use arrow keys to browse">
            <div className="mx-auto flex min-h-full items-center justify-center" style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
              {showingOriginal ? (
                <img src={imageSrc} alt={imageAlt} className="max-h-[calc(100dvh-13rem)] w-full object-contain drop-shadow-[0_18px_45px_rgba(15,23,42,0.16)]" draggable={false} />
              ) : current ? (
                <div className="h-[calc(100dvh-13rem)] min-h-[320px] w-full">
                  <VisualImage key={current.id} src={current.detailUrl} alt={current.alt} detail />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>

    <div className="shrink-0 border-t border-slate-200 bg-white">
      {selection !== "geography" ? (
        <div className="flex items-center justify-between gap-3 px-3 py-2 md:px-5">
          <div className="min-w-0">
            <p className="truncate font-serif text-sm font-semibold md:text-base">{showingOriginal ? plate.title : current?.title}</p>
            <p className="truncate text-[11px] text-slate-500">{showingOriginal ? plate.artist : current ? `${current.creator} · ${current.date} · ${KIND_LABELS[current.kind]}` : ""}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5" aria-label="Image magnification">
            <button type="button" className={controls} disabled={zoom <= 1} onClick={() => setMagnification(zoom - 0.5)} aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
            <button type="button" className={controls} onClick={() => setMagnification(1)} aria-label="Fit artwork"><Maximize2 className="h-4 w-4" /><span className="hidden sm:inline">{Math.round(zoom * 100)}%</span></button>
            <button type="button" className={controls} disabled={zoom >= 4} onClick={() => setMagnification(zoom + 0.5)} aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-3 py-2 md:px-5" aria-label="Passage artwork filmstrip">
        {ids.map((id, itemIndex) => {
          const asset = choices.find(item => item.id === id);
          const isOriginal = id === originalId && !asset;
          const selected = id === selection;
          return <button
            type="button"
            key={id}
            onClick={() => choose(id)}
            aria-label={id === "geography" ? "View interactive geography" : `View artwork ${itemIndex + 1}`}
            aria-current={selected ? "true" : undefined}
            className={`group relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border bg-slate-50 transition ${selected ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200 hover:border-slate-400"}`}
          >
            {id === "geography" ? <span className="flex h-full items-center justify-center px-2 text-center text-[10px] font-medium text-slate-600">Map / Earth</span>
              : isOriginal ? <img src={biblePlateAssetUrl(plate)} alt="" className="h-full w-full object-cover" />
              : asset ? <img src={asset.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              : null}
            <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] text-white">{itemIndex + 1}</span>
          </button>;
        })}
      </div>

      {current ? <div className="hidden border-t border-slate-100 px-5 py-2 text-[10px] leading-relaxed text-slate-500 lg:block">
        {current.source.credit} · {current.source.license} · {KIND_LABELS[current.kind]}
      </div> : null}
    </div>
  </section>;

  return createPortal(viewer, document.body);
}
