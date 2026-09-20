import { useId, useMemo, useRef, useState } from "react";
import { BOOKS } from "@/data/books";
import { KIND_LABELS, VISUAL_KINDS, type VisualAsset, type VisualKind } from "@/data/visualBible/types";
import { VISUAL_CATALOGUE } from "@/lib/visualBible/catalogue";
import { filterVisuals, passageLabel, visualPage } from "@/lib/visualBible/query";
import { VisualDetailDialog } from "./VisualDetailDialog";
import { VisualImage } from "./VisualImage";

type Props = { book?: string; chapter?: number; onNavigate?: () => void; assets?: readonly VisualAsset[] };
const inputClass = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground";
export function VisualBibleLibrary(props: Props) {
  return <LibraryBrowser key={`${props.book ?? "all"}:${props.chapter ?? "all"}`} {...props} />;
}
function LibraryBrowser({ book, chapter, onNavigate, assets = VISUAL_CATALOGUE }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<VisualKind | "all">("all");
  const [bookFilter, setBookFilter] = useState("");
  const [creator, setCreator] = useState("");
  const [source, setSource] = useState("");
  const [chapterOnly, setChapterOnly] = useState(Boolean(book));
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<VisualAsset | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const resultsHeading = useRef<HTMLParagraphElement | null>(null);
  const filters = useMemo(() => ({ query, kind, creator, source, book: chapterOnly ? book : bookFilter, chapter: chapterOnly ? chapter : undefined }), [query, kind, creator, source, chapterOnly, book, chapter, bookFilter]);
  const filtered = useMemo(() => filterVisuals(assets, filters), [assets, filters]);
  const categoryBase = useMemo(() => filterVisuals(assets, { ...filters, kind: "all" }), [assets, filters]);
  const counts = useMemo(() => Object.fromEntries(VISUAL_KINDS.map((key) => [key, categoryBase.filter((asset) => asset.kind === key).length])), [categoryBase]);
  const creators = useMemo(() => [...new Set(assets.map((asset) => asset.creator))].sort(), [assets]);
  const sources = useMemo(() => [...new Set(assets.map((asset) => asset.source.name))].sort(), [assets]);
  const books = useMemo(() => BOOKS.filter((item) => assets.some((asset) => asset.passages.some((p) => p.book === item.abbr))), [assets]);
  const current = visualPage(filtered, page);
  const contextName = BOOKS.find((item) => item.abbr === book)?.name ?? book;
  const reset = () => { setQuery(""); setKind("all"); setBookFilter(""); setCreator(""); setSource(""); setPage(1); };
  const changePage = (next: number) => { setPage(next); resultsHeading.current?.focus(); resultsHeading.current?.scrollIntoView?.({ block: "nearest" }); };

  return <section aria-label="Visual Bible library" className="min-w-0 space-y-5" data-testid="visual-bible-library">
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Explore the world of Scripture</p>
      <h2 className="font-serif text-2xl">Visual Bible library</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">Explore art, maps, objects and places linked to Scripture.</p>
      {book ? <div className="flex flex-wrap gap-2" aria-label="Library scope">
        <button type="button" aria-pressed={chapterOnly} className="min-h-11 rounded-full border px-4 text-sm aria-pressed:bg-primary aria-pressed:text-primary-foreground" onClick={() => { setChapterOnly(true); reset(); }}>This chapter · {contextName} {chapter}</button>
        <button type="button" aria-pressed={!chapterOnly} className="min-h-11 rounded-full border px-4 text-sm aria-pressed:bg-primary aria-pressed:text-primary-foreground" onClick={() => { setChapterOnly(false); reset(); }}>Entire library</button>
      </div> : null}
    </header>
    <div className="min-w-0 space-y-3 rounded-xl border bg-muted/20 p-3 sm:p-4">
      <label htmlFor={`${id}-search`} className="block text-sm font-medium">Search the collection</label>
      <input id={`${id}-search`} type="search" value={query} placeholder="Artist, place, object or Scripture…" className={inputClass} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">More filters{bookFilter || creator || source ? " · Active" : ""}</summary>
        <div className="grid gap-3 pb-2 sm:grid-cols-3">
          <label className="space-y-1 text-xs">Book<select aria-label="Filter by Bible book" className={inputClass} value={chapterOnly ? book : bookFilter} disabled={chapterOnly} onChange={(event) => { setBookFilter(event.target.value); setPage(1); }}>
            <option value="">All books</option>{books.map((item) => <option key={item.abbr} value={item.abbr}>{item.name}</option>)}
          </select></label>
          <label className="space-y-1 text-xs">Artist / maker<select aria-label="Filter by artist or maker" className={inputClass} value={creator} onChange={(event) => { setCreator(event.target.value); setPage(1); }}>
            <option value="">All artists and makers</option>{creators.map((name) => <option key={name}>{name}</option>)}
          </select></label>
          <label className="space-y-1 text-xs">Collection<select aria-label="Filter by source collection" className={inputClass} value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }}>
            <option value="">All collections</option>{sources.map((name) => <option key={name}>{name}</option>)}
          </select></label>
        </div>
      </details>
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 sm:flex-wrap" role="group" aria-label="Visual categories">
        <button type="button" aria-pressed={kind === "all"} className="min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground" onClick={() => { setKind("all"); setPage(1); }}>All ({categoryBase.length})</button>
        {VISUAL_KINDS.map((key) => <button key={key} type="button" aria-pressed={kind === key} className="min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground" onClick={() => { setKind(key); setPage(1); }}>{KIND_LABELS[key]} ({counts[key]})</button>)}
      </div>
      <p className="text-[11px] text-muted-foreground sm:hidden">Swipe categories to see maps, places and more.</p>
    </div>
    <div className="flex items-center justify-between gap-3">
      <p ref={resultsHeading} tabIndex={-1} aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground">{filtered.length} visuals · Page {current.page} of {current.pageCount}</p>
      <button type="button" onClick={reset} className="min-h-11 shrink-0 px-2 text-sm underline underline-offset-2">Clear filters</button>
    </div>
    {!filtered.length ? <div className="rounded-xl border p-8 text-center text-sm">
      <h3 className="mb-2 font-medium">No visuals match this selection</h3>
      <p className="text-muted-foreground">Try a different category or clear the search. A chapter with no matching material is not filled with unrelated images.</p>
      <button type="button" className="mt-4 min-h-11 rounded border px-4" onClick={() => { reset(); setChapterOnly(false); }}>Browse the entire library</button>
    </div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="visual-results">
      {current.items.map((asset) => <article key={asset.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-background" data-visual-id={asset.id}>
        <div className="aspect-[4/3] overflow-hidden bg-muted/30"><VisualImage src={asset.thumbnailUrl} alt={asset.alt} /></div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{KIND_LABELS[asset.kind]} · {asset.review === "legacy" ? "Legacy collection" : asset.review === "original" ? "Study guide" : "Source checked"}</p>
          <button type="button" className="min-h-11 text-left font-serif text-lg underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2" onClick={(event) => { returnFocus.current = event.currentTarget; setSelected(asset); }} aria-label={`View ${asset.title}`}>{asset.title}</button>
          <p className="text-xs text-muted-foreground">{asset.creator} · {asset.date}</p>
          <p className="text-xs">{asset.passages.slice(0, 2).map(passageLabel).join(" · ")}{asset.passages.length > 2 ? ` · +${asset.passages.length - 2} more` : ""}</p>
          <p className="mt-auto pt-2 text-[11px] text-muted-foreground">{asset.source.credit}</p>
          <p className="text-[11px] text-muted-foreground">{asset.source.license}{asset.source.licenseUrl ? <> · <a href={asset.source.licenseUrl} className="underline" target="_blank" rel="noopener noreferrer">Terms</a></> : null}{asset.review !== "original" ? " · Resized image" : ""}</p>
        </div>
      </article>)}
    </div>}
    {current.pageCount > 1 ? <nav aria-label="Visual library pages" className="flex items-center justify-between gap-4 border-t pt-4">
      <button type="button" className="min-h-11 rounded border px-4 disabled:opacity-40" disabled={current.page === 1} onClick={() => changePage(current.page - 1)}>Previous</button>
      <span className="text-sm">{current.page} / {current.pageCount}</span>
      <button type="button" className="min-h-11 rounded border px-4 disabled:opacity-40" disabled={current.page === current.pageCount} onClick={() => changePage(current.page + 1)}>Next</button>
    </nav> : null}
    {selected ? <VisualDetailDialog key={selected.id} asset={selected} returnFocus={returnFocus.current} onClose={() => setSelected(null)} onNavigate={onNavigate} /> : null}
  </section>;
}
