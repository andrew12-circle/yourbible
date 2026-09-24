import { useDeferredValue, useId, useMemo, useState } from "react";
import { Download, Loader2, Search } from "lucide-react";
import { BOOKS } from "@/data/books";
import { useBibleGeography } from "@/hooks/useBibleGeography";
import { filterGeographyPlaces, geographyBookNumber, geographyTranslation, parseGeographyVerseRange, GEOGRAPHY_TRANSLATIONS, type GeographyFilter, type GeographyTranslation } from "@/lib/bible/geography";
import { downloadGeographyKml } from "@/lib/bible/geographyKml";
import { BibleEarthPlaceCard } from "./BibleEarthPlaceCard";

interface Props { initialBook?: string; initialChapter?: number; initialTranslation?: string; onRead?: () => void }
const control = "min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm";
const button = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50";

export default function BibleEarthExplorer({ initialBook, initialChapter, initialTranslation, onRead }: Props) {
  const uid = useId();
  const initialNumber = geographyBookNumber(initialBook);
  const validInitialChapter = initialNumber && initialChapter && initialChapter >= 1 && initialChapter <= BOOKS[initialNumber - 1].chapters ? initialChapter : null;
  const [book, setBook] = useState<number | null>(initialNumber);
  const [chapter, setChapter] = useState<number | null>(validInitialChapter);
  const [translation, setTranslation] = useState<GeographyTranslation>(geographyTranslation(initialTranslation));
  const [query, setQuery] = useState("");
  const [verseText, setVerseText] = useState("");
  const [limit, setLimit] = useState(36);
  const [exportError, setExportError] = useState("");
  const deferredQuery = useDeferredValue(query);
  const atlas = useBibleGeography();
  const verseState = useMemo(() => {
    try { return { range: parseGeographyVerseRange(verseText), error: "" }; }
    catch (error) { return { range: null, error: error instanceof Error ? error.message : "Invalid verse range" }; }
  }, [verseText]);
  const filter = useMemo<GeographyFilter>(() => ({ book, chapter, verses: verseState.range, translation, query: deferredQuery }), [book, chapter, verseState.range, translation, deferredQuery]);
  const places = useMemo(() => verseState.error ? [] : filterGeographyPlaces(atlas.data?.places ?? [], filter), [atlas.data, filter, verseState.error]);
  const mappedCount = useMemo(() => places.filter((place) => place.candidates.length > 0).length, [places]);
  const title = book ? `${BOOKS[book - 1].name}${chapter ? ` ${chapter}` : ""}${verseText && chapter ? ` verses ${verseText}` : ""}` : "All Bible places";
  const reset = (nextBook: number | null, nextChapter: number | null) => {
    setBook(nextBook); setChapter(nextChapter); setVerseText(""); setQuery(""); setLimit(36); setExportError("");
  };
  const exportPlaces = (all: boolean) => {
    if (!atlas.data) return;
    try {
      setExportError("");
      downloadGeographyKml(all ? atlas.data.places : places, all ? "YourBible all places" : `YourBible ${title}`, all ? "all" : translation);
    } catch (error) { setExportError(error instanceof Error ? error.message : "The export failed. Please retry."); }
  };
  if (atlas.isPending) return <div role="status" className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading the Bible atlas…</div>;
  if (atlas.isError) return <div role="alert" className="space-y-3 rounded-xl border p-4"><p>{atlas.error.message}</p><button type="button" onClick={() => void atlas.refetch()} className={button}>Retry atlas</button><p className="text-sm"><a href="https://www.openbible.info/geo/" target="_blank" rel="noopener noreferrer" className="underline">Explore the source atlas</a></p></div>;
  return (
    <section aria-label="Bible Earth explorer" className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="max-h-[45dvh] shrink-0 space-y-3 overflow-y-auto pr-1">
        {initialBook && !initialNumber && <p role="status" className="rounded-lg bg-muted p-3 text-sm">This atlas covers the Protestant 66-book canon. This book is not indexed; showing the wider atlas instead.</p>}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <label className="col-span-2 text-xs font-medium" htmlFor={`${uid}-search`}>Search biblical or modern place names<div className="relative mt-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" /><input id={`${uid}-search`} value={query} onChange={(event) => { setQuery(event.target.value); setLimit(36); }} placeholder="Jerusalem, Bethel, Siloam…" className={`${control} pl-9`} /></div></label>
          <label className="text-xs font-medium" htmlFor={`${uid}-book`}>Book<select id={`${uid}-book`} className={`${control} mt-1`} value={book ?? ""} onChange={(event) => reset(event.target.value ? Number(event.target.value) : null, null)}><option value="">All 66 books</option>{BOOKS.map((entry, index) => <option key={entry.abbr} value={index + 1}>{entry.name}</option>)}</select></label>
          <label className="text-xs font-medium" htmlFor={`${uid}-chapter`}>Chapter<select id={`${uid}-chapter`} disabled={!book} className={`${control} mt-1`} value={chapter ?? ""} onChange={(event) => { setChapter(event.target.value ? Number(event.target.value) : null); setVerseText(""); setLimit(36); }}><option value="">All chapters</option>{book && Array.from({ length: BOOKS[book - 1].chapters }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
          <label className="text-xs font-medium" htmlFor={`${uid}-verses`}>Verses (optional)<input id={`${uid}-verses`} disabled={!chapter} value={verseText} onChange={(event) => { setVerseText(event.target.value); setLimit(36); }} placeholder="7 or 1–12" aria-invalid={!!verseState.error} aria-describedby={verseState.error ? `${uid}-error` : undefined} className={`${control} mt-1`} /></label>
          <label className="text-xs font-medium" htmlFor={`${uid}-translation`}>Reference translation<select id={`${uid}-translation`} value={translation} onChange={(event) => { setTranslation(event.target.value as GeographyTranslation); setLimit(36); }} className={`${control} mt-1`}><option value="all">All source translations</option>{GEOGRAPHY_TRANSLATIONS.map((name) => <option key={name} value={name}>{name.toUpperCase()}</option>)}</select></label>
          <div className="col-span-2 flex flex-wrap items-end gap-2"><button type="button" className={button} onClick={() => { reset(null, null); setTranslation("all"); }}>All Bible places</button>{initialNumber && <button type="button" className={button} onClick={() => { reset(initialNumber, validInitialChapter); setTranslation(geographyTranslation(initialTranslation)); }}>Return to my passage</button>}</div>
        </div>
        {verseState.error && <p id={`${uid}-error`} role="alert" className="text-sm text-destructive">{verseState.error}</p>}
        <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={!places.length || !!verseState.error} onClick={() => exportPlaces(false)}><Download className="h-4 w-4" aria-hidden="true" />Export these places</button><button type="button" className={button} onClick={() => exportPlaces(true)}>Export entire atlas</button><a className={button} href="https://earth.google.com/web/" target="_blank" rel="noopener noreferrer">Open Google Earth</a></div>
        {exportError && <p role="alert" className="text-sm text-destructive">{exportError}</p>}
        <details className="text-xs leading-relaxed text-muted-foreground"><summary className="cursor-pointer font-medium">Import into Google Earth · coverage and sources</summary><div className="mt-2 space-y-2"><p>Export a KML file, open Google Earth, then choose New → Open local KML file. To save it to a signed-in Google project, choose New → Import file to project. Importing into your Google account is a separate step.</p><p>These exports contain labeled reference points, not reconstructed travel paths. For the source's richer river and region geometry, use the <a href="/bible-geography/source-atlas.kml" download className="underline">original OpenBible KML</a>. That file is the source's partial geographic representation.</p><p>Source snapshot: {atlas.data.source.sourceDate}. Covers place-name associations in the Protestant 66 books and ten translations, not every implied event setting. Confidence is the source's assessment, not independent proof. Modern imagery is not an ancient reconstruction; Street View coverage varies.</p><p><a href="https://www.openbible.info/geo/" target="_blank" rel="noopener noreferrer" className="underline">OpenBible.info</a> · CC BY 4.0 · Includes OpenStreetMap contributors (ODbL 1.0). <a href="/bible-geography/ATTRIBUTION.txt" target="_blank" rel="noopener noreferrer" className="underline">Attribution and changes</a></p></div></details>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t pt-3"><h2 className="font-semibold">{title}</h2><p role="status" className="text-xs text-muted-foreground">{places.length.toLocaleString()} places · {mappedCount.toLocaleString()} with candidates · {(places.length - mappedCount).toLocaleString()} unlocated</p></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-4">
        {places.length ? <><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{places.slice(0, limit).map((place) => <BibleEarthPlaceCard key={place.id} place={place} filter={filter} onRead={onRead} />)}</div>{places.length > limit && <button type="button" className={`${button} mt-4 w-full`} onClick={() => setLimit((value) => value + 36)}>Show more places ({places.length - limit} remaining)</button>}</> : <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"><p>No place-name associations match this filter. This does not establish where all events occurred.</p><button type="button" className={`${button} mt-3`} onClick={() => { reset(null, null); setTranslation("all"); }}>Explore the entire atlas</button></div>}
      </div>
    </section>
  );
}
