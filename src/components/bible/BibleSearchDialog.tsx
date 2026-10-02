// universal-bible-search-v1
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Globe2,
  Images,
  Languages,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchBible, type BibleSearchHit } from "@/lib/bible/api";
import {
  isCanonicalCsbBible,
  countIndexedVerses,
} from "@/lib/bible/canonical";
import { BOOKS, findBookByAbbr, type BibleBook } from "@/data/books";
import { looksLikeBibleReference, parseBibleReference } from "@/lib/bible/parseBibleReference";
import { pushRecentSearch, readRecentSearches } from "@/lib/bible/searchRecent";
import { lookupStrongs, type StrongsEntry } from "@/lib/bible/strongsDictionary";
import {
  bibleHubSearchUrl,
  matchingBibleBooks,
  universalEarthHref,
  universalLifeGuideHref,
  universalVisualHref,
  visualSectionForKind,
} from "@/lib/bible/universalSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type Props = {
  open: boolean;
  onClose: () => void;
  bibleId: string;
};

type VisualSearchHit = {
  id: string;
  kind: string;
  title: string;
  creator: string;
  thumbnailUrl: string;
  alt: string;
};

const toolCard =
  "group flex min-h-[76px] items-start gap-3 rounded-2xl border bg-card/70 p-3 text-left transition hover:border-foreground/15 hover:bg-muted/45";

function sectionLabel(kind: string): string {
  if (kind === "artwork") return "Artwork";
  if (kind === "place-photo") return "Place";
  if (kind === "map") return "Map";
  if (kind === "architecture") return "Architecture";
  if (kind === "manuscript") return "Manuscript";
  if (kind === "artifact") return "Artifact";
  if (kind === "timeline") return "Timeline";
  return "Visual";
}

export function BibleSearchDialog({ open, onClose, bibleId }: Props) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [query, setQuery] = useState("");
  const [bookFilter, setBookFilter] = useState<string>("all");
  const [results, setResults] = useState<BibleSearchHit[]>([]);
  const [visualResults, setVisualResults] = useState<VisualSearchHit[]>([]);
  const [strongsEntry, setStrongsEntry] = useState<StrongsEntry | null>(null);
  const [strongsChecked, setStrongsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visualLoading, setVisualLoading] = useState(false);
  const [strongsLoading, setStrongsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [localIndexSize, setLocalIndexSize] = useState(0);

  const trimmedQuery = query.trim();
  const parsedRef = useMemo(
    () => (looksLikeBibleReference(query) ? parseBibleReference(query) : null),
    [query],
  );
  const strongsQuery = useMemo(() => trimmedQuery.replace(/\s+/g, "").toUpperCase(), [trimmedQuery]);
  const explicitStrongs = /^[HG]\d{1,5}$/.test(strongsQuery);
  const bookMatches = useMemo(() => matchingBibleBooks(trimmedQuery), [trimmedQuery]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setVisualResults([]);
      setStrongsEntry(null);
      setStrongsChecked(false);
      setError(null);
      setBookFilter("all");
      return;
    }
    setRecent(readRecentSearches());
  }, [open]);

  useEffect(() => {
    if (!open || !isCanonicalCsbBible(bibleId)) return;
    void countIndexedVerses(bibleId).then(setLocalIndexSize);
  }, [open, bibleId]);

  useEffect(() => {
    if (!open || !bibleId || trimmedQuery.length < 2 || parsedRef || explicitStrongs) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      if (isCanonicalCsbBible(bibleId)) {
        try {
          const mapped = await searchBible(bibleId, trimmedQuery, 40, controller.signal);
          const filtered =
            bookFilter === "all" ? mapped : mapped.filter((hit) => hit.book === bookFilter);
          setResults(filtered);
        } catch (err) {
          if (!controller.signal.aborted) {
            setError(err instanceof Error ? err.message : "Local search failed");
            setResults([]);
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
        return;
      }

      if (!online) {
        setError(
          localIndexSize > 0
            ? "No local index for this translation yet. Read chapters while online to build it."
            : "Scripture text search requires an internet connection for this translation.",
        );
        setResults([]);
        setLoading(false);
        return;
      }

      searchBible(bibleId, trimmedQuery, 40, controller.signal)
        .then((hits) => (
          bookFilter === "all" ? hits : hits.filter((hit) => hit.book === bookFilter)
        ))
        .then(setResults)
        .catch((err) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : "Scripture search failed");
          setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    open,
    bibleId,
    trimmedQuery,
    parsedRef,
    explicitStrongs,
    online,
    bookFilter,
    localIndexSize,
  ]);

  useEffect(() => {
    if (!open || trimmedQuery.length < 2 || explicitStrongs) {
      setVisualResults([]);
      setVisualLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setVisualLoading(true);
      try {
        const [{ VISUAL_CATALOGUE }, { explorerVisuals }] = await Promise.all([
          import("@/lib/visualBible/catalogue"),
          import("@/lib/visualBible/explorerModel"),
        ]);
        if (cancelled) return;
        const matches = explorerVisuals(VISUAL_CATALOGUE, {
          section: "discover",
          query: trimmedQuery,
          collection: "all",
          creator: "",
          period: "",
          saved: [],
        }).slice(0, 4);
        setVisualResults(matches.map((asset) => ({
          id: asset.id,
          kind: asset.kind,
          title: asset.title,
          creator: asset.creator,
          thumbnailUrl: asset.thumbnailUrl,
          alt: asset.alt,
        })));
      } catch {
        if (!cancelled) setVisualResults([]);
      } finally {
        if (!cancelled) setVisualLoading(false);
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, trimmedQuery, explicitStrongs]);

  useEffect(() => {
    if (!open || !explicitStrongs) {
      setStrongsEntry(null);
      setStrongsChecked(false);
      setStrongsLoading(false);
      return;
    }

    const controller = new AbortController();
    setStrongsLoading(true);
    setStrongsChecked(false);
    void lookupStrongs(strongsQuery, undefined, controller.signal)
      .then((entry) => {
        if (!controller.signal.aborted) {
          setStrongsEntry(entry);
          setStrongsChecked(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStrongsEntry(null);
          setStrongsChecked(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setStrongsLoading(false);
      });
    return () => controller.abort();
  }, [open, explicitStrongs, strongsQuery]);

  if (!open) return null;

  const remember = (value = trimmedQuery) => {
    if (!value) return;
    pushRecentSearch(value);
    setRecent(readRecentSearches());
  };

  const go = (href: string) => {
    remember();
    onClose();
    navigate(href);
  };

  const jumpToHit = (hit: BibleSearchHit) => {
    remember(trimmedQuery || hit.reference);
    const book = findBookByAbbr(hit.book);
    const abbr = book?.abbr ?? hit.book;
    onClose();
    navigate(`/read/${abbr}/${hit.chapter}?v=${hit.verse}`);
  };

  const jumpToReference = () => {
    if (!parsedRef) return;
    remember(trimmedQuery);
    onClose();
    const suffix = parsedRef.verse ? `?v=${parsedRef.verse}` : "";
    navigate(`/read/${parsedRef.bookAbbr}/${parsedRef.chapter}${suffix}`);
  };

  const jumpToBook = (book: BibleBook) => {
    remember(trimmedQuery || book.name);
    onClose();
    navigate(`/read/${book.abbr}/1`);
  };

  const openBibleHub = () => remember();

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-zinc-950/45 px-3 pt-[max(1.25rem,env(safe-area-inset-top))] backdrop-blur-sm sm:px-6 sm:pt-[max(4rem,env(safe-area-inset-top))]"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        aria-label="Universal Bible search"
        className="flex max-h-[min(86dvh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/60 bg-background/95 shadow-2xl"
      >
        <div className="border-b px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && parsedRef) jumpToReference();
              }}
              placeholder="Search Scripture, people, places, topics, Strong's…"
              className="h-11 border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0 sm:text-lg"
              aria-label="Search Bible and study library"
            />
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close search">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="pl-8 text-[11px] text-muted-foreground sm:pl-9">
            Scripture · books · Strong&apos;s · places · artwork · deeper study
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {!trimmedQuery ? (
            <div className="space-y-5">
              {recent.length > 0 && (
                <section>
                  <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Recent
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recent.slice(0, 8).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setQuery(value)}
                        className="rounded-full border bg-card px-3 py-2 text-sm hover:bg-muted/60"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Explore
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" className={toolCard} onClick={() => go("/bible/earth")}>
                    <span className="rounded-xl bg-sky-500/10 p-2 text-sky-700">
                      <Globe2 className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">Bible Earth</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Places, ancient names and Google Earth</span>
                    </span>
                  </button>
                  <button type="button" className={toolCard} onClick={() => go("/bible/explore")}>
                    <span className="rounded-xl bg-violet-500/10 p-2 text-violet-700">
                      <Images className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">Visual Bible</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Artwork, maps, manuscripts and objects</span>
                    </span>
                  </button>
                  <button type="button" className={toolCard} onClick={() => go("/bible/life-guide")}>
                    <span className="rounded-xl bg-amber-500/10 p-2 text-amber-700">
                      <Sparkles className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">Ask Scripture</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Bring a question or life issue to Scripture</span>
                    </span>
                  </button>
                  <a
                    className={toolCard}
                    href={bibleHubSearchUrl("")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="rounded-xl bg-emerald-500/10 p-2 text-emerald-700">
                      <ExternalLink className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">BibleHub</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Open classic parallel study tools</span>
                    </span>
                  </a>
                </div>
              </section>

              <p className="rounded-2xl bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                Try “John 3:16”, “faith Abraham”, “Jerusalem”, “Rembrandt”, or “G4102”.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {parsedRef && (
                <section>
                  <button
                    type="button"
                    onClick={jumpToReference}
                    className="flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition hover:bg-primary/10"
                  >
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                      <BookOpen className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Go to Scripture</span>
                      <span className="mt-1 block text-base font-semibold">
                        {findBookByAbbr(parsedRef.bookAbbr)?.name ?? parsedRef.bookAbbr} {parsedRef.chapter}
                        {parsedRef.verse ? `:${parsedRef.verse}` : ""}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </button>
                </section>
              )}

              {explicitStrongs && (
                <section>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <Languages className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <h2 className="text-xs font-semibold uppercase tracking-[0.14em]">Strong&apos;s word study</h2>
                  </div>
                  {strongsLoading ? (
                    <div className="flex items-center gap-2 rounded-2xl border p-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Looking up {strongsQuery}…
                    </div>
                  ) : strongsEntry ? (
                    <div className="rounded-2xl border bg-card p-4">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-xs font-semibold text-primary">{strongsEntry.id}</span>
                        <span className="text-xl font-semibold">{strongsEntry.lemma || strongsEntry.transliteration}</span>
                        {strongsEntry.transliteration && (
                          <span className="text-sm text-muted-foreground">{strongsEntry.transliteration}</span>
                        )}
                      </div>
                      {strongsEntry.pronunciation && (
                        <p className="mt-1 text-xs text-muted-foreground">{strongsEntry.pronunciation}</p>
                      )}
                      <p className="mt-3 text-sm leading-relaxed">{strongsEntry.definition || strongsEntry.kjvUsage}</p>
                    </div>
                  ) : strongsChecked ? (
                    <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      No local Strong&apos;s entry was found for {strongsQuery}.
                    </p>
                  ) : null}
                </section>
              )}

              {!parsedRef && bookMatches.length > 0 && (
                <section>
                  <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Books
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {bookMatches.map((book) => (
                      <button
                        key={book.abbr}
                        type="button"
                        onClick={() => jumpToBook(book)}
                        className="flex min-h-12 items-center justify-between rounded-xl border bg-card px-3 py-2 text-left hover:bg-muted/50"
                      >
                        <span>
                          <span className="block text-sm font-semibold">{book.name}</span>
                          <span className="block text-xs text-muted-foreground">{book.chapters} chapters</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {!parsedRef && !explicitStrongs && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <div>
                      <h2 className="text-xs font-semibold uppercase tracking-[0.14em]">Scripture</h2>
                      {isCanonicalCsbBible(bibleId) && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Bundled CSB · works offline</p>
                      )}
                    </div>
                    <Select value={bookFilter} onValueChange={setBookFilter}>
                      <SelectTrigger className="h-8 w-[138px] text-xs" aria-label="Filter Scripture results by book">
                        <SelectValue placeholder="All books" />
                      </SelectTrigger>
                      <SelectContent className="z-[150] max-h-64">
                        <SelectItem value="all">All books</SelectItem>
                        {BOOKS.map((book) => (
                          <SelectItem key={book.abbr} value={book.abbr}>{book.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed py-7 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Searching Scripture…
                    </div>
                  )}
                  {error && !loading && (
                    <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{error}</p>
                  )}
                  {!loading && !error && results.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border bg-card">
                      {results.slice(0, 12).map((hit, index) => (
                        <button
                          key={`${hit.reference}-${index}`}
                          type="button"
                          onClick={() => jumpToHit(hit)}
                          className="block w-full border-b px-4 py-3 text-left transition last:border-b-0 hover:bg-muted/50"
                        >
                          <span className="text-xs font-semibold text-primary">{hit.reference}</span>
                          <span className="mt-0.5 block text-sm leading-relaxed text-foreground/90">{hit.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!loading && !error && results.length === 0 && trimmedQuery.length >= 2 && (
                    <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      No direct Scripture text match yet. The study tools below can still search this topic.
                    </p>
                  )}
                </section>
              )}

              {!explicitStrongs && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.14em]">Visual study</h2>
                    {visualLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Searching visuals" />}
                  </div>
                  {visualResults.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {visualResults.map((visual) => (
                        <button
                          key={visual.id}
                          type="button"
                          onClick={() => go(universalVisualHref(trimmedQuery, visualSectionForKind(visual.kind), visual.id))}
                          className="group flex min-w-0 gap-3 overflow-hidden rounded-2xl border bg-card p-2 text-left hover:bg-muted/45"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                            <img
                              src={visual.thumbnailUrl}
                              alt={visual.alt}
                              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          </div>
                          <span className="min-w-0 py-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              {sectionLabel(visual.kind)}
                            </span>
                            <span className="mt-0.5 block truncate text-sm font-semibold">{visual.title}</span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground">{visual.creator}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : !visualLoading ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl border border-dashed p-4 text-left hover:bg-muted/40"
                      onClick={() => go(universalVisualHref(trimmedQuery))}
                    >
                      <span className="flex items-center gap-3">
                        <Images className="h-5 w-5 text-muted-foreground" aria-hidden />
                        <span>
                          <span className="block text-sm font-semibold">Search the visual library</span>
                          <span className="block text-xs text-muted-foreground">Artwork, maps, objects and manuscripts</span>
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </button>
                  ) : null}
                </section>
              )}

              <section>
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Keep exploring
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" className={toolCard} onClick={() => go(universalEarthHref(trimmedQuery))}>
                    <span className="rounded-xl bg-sky-500/10 p-2 text-sky-700">
                      <Globe2 className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">Places on Earth</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">Search “{trimmedQuery}” in the biblical atlas</span>
                    </span>
                  </button>
                  <button type="button" className={toolCard} onClick={() => go(universalVisualHref(trimmedQuery))}>
                    <span className="rounded-xl bg-violet-500/10 p-2 text-violet-700">
                      <Images className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">Visual Bible</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">Search artwork, maps and manuscripts</span>
                    </span>
                  </button>
                  <button type="button" className={toolCard} onClick={() => go(universalLifeGuideHref(trimmedQuery))}>
                    <span className="rounded-xl bg-amber-500/10 p-2 text-amber-700">
                      <Sparkles className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">Ask Scripture</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">Study this as a question or life topic</span>
                    </span>
                  </button>
                  <a
                    className={toolCard}
                    href={bibleHubSearchUrl(trimmedQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={openBibleHub}
                  >
                    <span className="rounded-xl bg-emerald-500/10 p-2 text-emerald-700">
                      <ExternalLink className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">BibleHub</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">Open “{trimmedQuery}” in BibleHub</span>
                    </span>
                  </a>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
