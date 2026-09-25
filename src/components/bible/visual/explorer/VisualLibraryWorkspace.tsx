import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { Bookmark, Compass, Globe2, Images, Landmark, Layers3, Map, Search, SlidersHorizontal, Download } from "lucide-react";
import { BOOKS } from "@/data/books";
import type { VisualAsset } from "@/data/visualBible/types";
import { VISUAL_CATALOGUE } from "@/lib/visualBible/catalogue";
import { VISUAL_COLLECTIONS, filterCollection, type CollectionFilter } from "@/lib/visualBible/collections";
import { EXPLORER_SECTIONS, explorerPlaces, explorerVisuals, placeIllustration, type ExplorerSection } from "@/lib/visualBible/explorerModel";
import { geographyTranslation, GEOGRAPHY_TRANSLATIONS, type GeographyTranslation } from "@/lib/bible/geography";
import { downloadGeographyKml } from "@/lib/bible/geographyKml";
import { useBibleGeography } from "@/hooks/useBibleGeography";
import { useVisualSaved } from "@/hooks/useVisualSaved";
import { VisualGallery, VisualPreview, FeaturedVisual, galleryGrid, explorerButton } from "./VisualGallery";
import { VisualArtworkView } from "./VisualArtworkView";
import { VisualPlacesView } from "./VisualPlacesView";
const icons = { discover: Compass, art: Images, maps: Map, places: Globe2, objects: Landmark, collections: Layers3, saved: Bookmark };
const input = "min-h-11 w-full min-w-0 rounded-xl border bg-background px-3 text-sm text-foreground";
type Props = { book?: string; chapter?: number; translation?: string; ownerId?: string; onNavigate?: () => void; assets?: readonly VisualAsset[] };
export default function VisualLibraryWorkspace(props: Props) {
  return <Workspace key={`${props.ownerId ?? "guest"}:${props.book}:${props.chapter}:${props.translation}`} {...props} />;
}
function Workspace({ book, chapter, translation: abbreviation, ownerId, onNavigate, assets = VISUAL_CATALOGUE }: Props) {
  const id = useId();
  const atlas = useBibleGeography();
  const saved = useVisualSaved(ownerId);
  const [section, setSection] = useState<ExplorerSection>("discover");
  const [chapterOnly, setChapterOnly] = useState(Boolean(book));
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<CollectionFilter>("all");
  const [creator, setCreator] = useState("");
  const [period, setPeriod] = useState("");
  const [libraryBook, setLibraryBook] = useState("");
  const [translation, setTranslation] = useState<GeographyTranslation>(geographyTranslation(abbreviation));
  const [refine, setRefine] = useState(false);
  const [limit, setLimit] = useState(24);
  const [selected, setSelected] = useState<VisualAsset | null>(null);
  const [exportError, setExportError] = useState("");
  const deferredQuery = useDeferredValue(query);
  const scroller = useRef<HTMLDivElement>(null);
  const previousScroll = useRef(0);
  const opener = useRef<HTMLElement | null>(null);
  const activeBook = chapterOnly ? book : libraryBook || undefined;
  const activeChapter = chapterOnly ? chapter : undefined;
  const filters = useMemo(() => ({ section, query: deferredQuery, collection, creator, period, book: activeBook, chapter: activeChapter, saved: saved.ids }), [section, deferredQuery, collection, creator, period, activeBook, activeChapter, saved.ids]);
  const visuals = useMemo(() => explorerVisuals(assets, filters), [assets, filters]);
  const scopeVisuals = useMemo(() => explorerVisuals(assets, { ...filters, section: "discover", collection: "all" }), [assets, filters]);
  const places = useMemo(() => explorerPlaces(atlas.data?.places ?? [], deferredQuery, activeBook, activeChapter, translation).filter(place => section !== "saved" || saved.ids.includes(`place:${place.id}`)), [atlas.data, deferredQuery, activeBook, activeChapter, translation, section, saved.ids]);
  const facets = useMemo(() => ({ creators: [...new Set(assets.map(asset => asset.creator))].sort(), periods: [...new Set(assets.map(asset => asset.period).filter((p): p is string => Boolean(p)))].sort() }), [assets]);
  const selectedPlaces = useMemo(() => selected ? (atlas.data?.places ?? []).filter(place => placeIllustration(place, [selected])?.id === selected.id).slice(0, 3) : [], [atlas.data, selected]);
  const contextName = BOOKS.find(item => item.abbr === book)?.name ?? book;
  const scopeLabel = chapterOnly ? `${contextName} ${chapter}` : libraryBook ? BOOKS.find(item => item.abbr === libraryBook)?.name : "Entire library";
  const currentSection = EXPLORER_SECTIONS.find(item => item.id === section)!;
  const hasFilters = Boolean(query || collection !== "all" || creator || period || libraryBook);
  const showPlaces = section === "discover" || section === "places" || section === "saved";
  const selectedIndex = selected ? visuals.findIndex(asset => asset.id === selected.id) : -1;
  const featured = section === "discover" && chapterOnly && !hasFilters ? visuals.find(asset => asset.kind === "artwork") : undefined;
  const visibleVisuals = visuals.filter(asset => asset.id !== featured?.id).slice(0, section === "discover" ? 8 : limit);
  useEffect(() => { setSelected(null); setLimit(24); setExportError(""); if (scroller.current) scroller.current.scrollTop = 0; }, [section, chapterOnly, deferredQuery, collection, creator, period, libraryBook, translation]);
  const go = (next: ExplorerSection) => { setSection(next); setCollection("all"); setCreator(""); setPeriod(""); };
  const clear = () => { setQuery(""); setCollection("all"); setCreator(""); setPeriod(""); setLibraryBook(""); };
  const select = (asset: VisualAsset, element: HTMLElement) => { opener.current = element; previousScroll.current = scroller.current?.scrollTop ?? 0; setSelected(asset); if (scroller.current) scroller.current.scrollTop = 0; };
  const back = () => { setSelected(null); requestAnimationFrame(() => { if (scroller.current) scroller.current.scrollTop = previousScroll.current; if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); else scroller.current?.focus({ preventScroll: true }); }); };
  const step = (direction: number) => { const next = visuals[selectedIndex + direction]; if (next) { setSelected(next); if (scroller.current) scroller.current.scrollTop = 0; } };
  const exportPlaces = () => { try { downloadGeographyKml(places, `YourBible ${scopeLabel} places`, translation); setExportError(""); } catch { setExportError("The export failed. Please retry."); } };
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row" data-testid="visual-library-workspace">
    <aside className="hidden w-52 shrink-0 flex-col border-r bg-muted/20 p-4 md:flex"><p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Visual library</p><nav aria-label="Visual library sections" className="space-y-1">{EXPLORER_SECTIONS.map(item => { const Icon = icons[item.id]; return <button type="button" key={item.id} aria-current={section === item.id ? "page" : undefined} onClick={() => go(item.id)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${section === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Icon className="h-4 w-4 shrink-0" />{item.label}{item.id === "saved" && saved.ids.length > 0 && <span className="ml-auto text-xs">{saved.ids.length}</span>}</button>; })}</nav><p className="mt-auto px-3 pt-6 text-xs leading-relaxed text-muted-foreground">Browse without turning your Bible page. Favorites stay on this device.</p></aside>
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 border-b p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h2 className="font-serif text-xl">{currentSection.label}</h2><p className="text-xs text-muted-foreground">{scopeLabel}</p></div><div className="flex gap-2">{book && <select aria-label="Library scope" className={`${input} max-w-48`} value={chapterOnly ? "chapter" : "all"} onChange={event => setChapterOnly(event.target.value === "chapter")}><option value="chapter">This chapter · {contextName} {chapter}</option><option value="all">Entire library</option></select>}<button type="button" className={explorerButton} aria-expanded={refine} aria-controls={`${id}-filters`} onClick={() => setRefine(value => !value)} title="Refine the collection"><SlidersHorizontal className="h-4 w-4" /><span className="hidden sm:inline">Refine</span></button></div></div>
        <div className="flex gap-2"><select aria-label="Browse visual library" className={`${input} max-w-44 md:hidden`} value={section} onChange={event => go(event.target.value as ExplorerSection)}>{EXPLORER_SECTIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><label className="relative min-w-0 flex-1"><span className="sr-only">Search artwork, places or Scripture</span><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input type="search" className={`${input} pl-9`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Artist, artwork, place or Matthew 16:13…" /></label></div>
        {refine && <div id={`${id}-filters`} className="grid max-h-48 gap-3 overflow-y-auto rounded-xl bg-muted/25 p-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs">Bible book<select aria-label="Filter library by book" className={`${input} mt-1`} disabled={chapterOnly} value={chapterOnly ? book : libraryBook} onChange={event => setLibraryBook(event.target.value)}><option value="">All books</option>{BOOKS.map(item => <option key={item.abbr} value={item.abbr}>{item.name}</option>)}</select></label>{section !== "places" && <><label className="text-xs">Artist / maker<select className={`${input} mt-1`} value={creator} onChange={event => setCreator(event.target.value)}><option value="">All artists</option>{facets.creators.map(name => <option key={name}>{name}</option>)}</select></label><label className="text-xs">Period / tradition<select className={`${input} mt-1`} value={period} onChange={event => setPeriod(event.target.value)}><option value="">All periods</option>{facets.periods.map(name => <option key={name}>{name}</option>)}</select></label></>}<label className="text-xs">Place-reference translation<select className={`${input} mt-1`} value={translation} onChange={event => setTranslation(event.target.value as GeographyTranslation)}><option value="all">All source translations</option>{GEOGRAPHY_TRANSLATIONS.map(name => <option key={name} value={name}>{name.toUpperCase()}</option>)}</select></label></div>}
        {hasFilters && <div className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-muted-foreground">{[collection !== "all" ? collection : "", creator, period, libraryBook].filter(Boolean).join(" · ") || "Search active"}</span><button type="button" className="min-h-8 shrink-0 underline" onClick={clear}>Clear filters</button></div>}
        {saved.error && <p role="alert" className="text-xs text-destructive">{saved.error}</p>}
      </div>
      <div ref={scroller} tabIndex={-1} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6" data-testid="visual-workspace-scroll">
        {selected ? <VisualArtworkView key={selected.id} asset={selected} index={selectedIndex} total={visuals.length} onStep={step} onBack={back} saved={saved.ids.includes(`visual:${selected.id}`)} onSave={() => saved.toggle(`visual:${selected.id}`)} onNavigate={onNavigate} places={selectedPlaces} /> : <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground" role="status">{section === "places" ? `${places.length} places` : `${visuals.length} visuals`}{section === "discover" && atlas.data ? ` · ${places.length} places` : ""}</p>{section === "places" && <button type="button" className={explorerButton} disabled={!places.length} onClick={exportPlaces}><Download className="h-4 w-4" />Export places to Earth</button>}</div>
          {exportError && <p role="alert" className="mb-3 text-sm text-destructive">{exportError}</p>}
          {section === "saved" && <p className="mb-5 text-sm text-muted-foreground">Favorites are private to this account on this browser, not synced to other devices.{chapterOnly ? " Switch to Entire library to see favorites from other chapters." : ""}</p>}
          {section === "collections" ? <div className={galleryGrid}>{VISUAL_COLLECTIONS.map(item => { const records = filterCollection(scopeVisuals, item.id); const cover = records[0]; return <button type="button" key={item.id} className="group overflow-hidden rounded-2xl border bg-card text-left hover:shadow-md disabled:opacity-50" disabled={!records.length} onClick={() => { setSection("art"); setCollection(item.id); if (item.id !== "masterworks") setSection("discover"); }}><div className="h-44 bg-muted/30">{cover ? <VisualPreview asset={cover} /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No matching visuals in this scope</div>}</div><div className="space-y-2 p-5"><h3 className="font-serif text-xl">{item.title}</h3><p className="text-sm text-muted-foreground">{item.description}</p><p className="text-xs">{records.length} visuals</p></div></button>; })}</div> : <>
            {featured && <FeaturedVisual asset={featured} onSelect={select} />}
            {visibleVisuals.length > 0 && <><div className="mb-4 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{section === "places" ? "Site photography" : featured ? "More connections" : "Browse the collection"}</h3>{section === "discover" && visuals.length > 8 && <button type="button" className="min-h-11 text-sm underline" onClick={() => { setSection("art"); setCollection("all"); }}>Open art gallery</button>}</div><VisualGallery assets={visibleVisuals} saved={saved.ids} onSave={saved.toggle} onSelect={select} /></>}
            {section !== "discover" && visuals.length > limit && <button type="button" className={`${explorerButton} mt-5 w-full`} onClick={() => setLimit(value => value + 24)}>Show more artwork ({visuals.length - limit} remaining)</button>}
            {!visuals.length && section !== "places" && <div className="rounded-xl border border-dashed p-6"><h3 className="font-medium">{section === "saved" ? "No saved visuals in this view" : "No artwork matches this view"}</h3><p className="mt-2 text-sm text-muted-foreground">Try a different category or browse the entire library. Unrelated images are not substituted for your passage.</p><button type="button" className={`${explorerButton} mt-4`} onClick={() => { setChapterOnly(false); clear(); if (section === "saved") go("discover"); }}>Browse entire library</button></div>}
            {showPlaces && <section className="mt-7 space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-base font-semibold"><Globe2 className="h-4 w-4" />{chapterOnly ? `Places in ${contextName} ${chapter}` : "Explore places on Earth"}</h3>{section !== "places" && places.length > 0 && <button type="button" className={explorerButton} onClick={() => go("places")}>Browse places ({places.length})</button>}</div>{atlas.isPending ? <p role="status" className="text-sm">Loading place references…</p> : atlas.isError ? <div role="alert" className="rounded-xl border p-4 text-sm">Place references could not load. Artwork is still available.<button type="button" className={`${explorerButton} ml-3`} onClick={() => void atlas.refetch()}>Retry places</button></div> : <><p className="text-xs leading-relaxed text-muted-foreground">Modern terrain, not a reconstruction of biblical buildings. Unknown and alternative identifications are kept separate. References: {translation === "all" ? "all source translations" : translation.toUpperCase()}.</p>{places.length ? <><VisualPlacesView places={places.slice(0, section === "discover" ? 3 : limit)} assets={assets} saved={saved.ids} onSave={saved.toggle} translation={translation} book={activeBook} chapter={activeChapter} onNavigate={onNavigate} />{section !== "discover" && places.length > limit && <button type="button" className={`${explorerButton} w-full`} onClick={() => setLimit(value => value + 24)}>Show more places ({places.length - limit} remaining)</button>}</> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No place-name references match this scope. This does not establish where every event occurred. Search the entire library to explore elsewhere.</p>}</>}</section>}
          </>}
          <footer className="mt-8 border-t pt-4 text-[11px] leading-relaxed text-muted-foreground">Art and geography are study context, never added to the Scripture text. Geography: <a className="underline" href="https://www.openbible.info/geo/" target="_blank" rel="noopener noreferrer">OpenBible.info</a> (2021 source snapshot), CC BY 4.0; includes OpenStreetMap contributors, ODbL 1.0. <a className="underline" href="/bible-geography/ATTRIBUTION.txt" target="_blank" rel="noopener noreferrer">Attribution</a>. Image rights and research are available with each work.</footer>
        </>}
      </div>
    </div>
  </div>;
}
