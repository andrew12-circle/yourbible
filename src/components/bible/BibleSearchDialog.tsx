import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchBible, type BibleSearchHit } from "@/lib/bible/api";
import {
  isCanonicalCsbBible,
  searchCanonicalVerses,
  countIndexedVerses,
  type LocalVerseSearchHit,
} from "@/lib/bible/canonical";
import { BOOKS, findBookByAbbr } from "@/data/books";
import { looksLikeBibleReference, parseBibleReference } from "@/lib/bible/parseBibleReference";
import { pushRecentSearch, readRecentSearches } from "@/lib/bible/searchRecent";
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

export function BibleSearchDialog({ open, onClose, bibleId }: Props) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [query, setQuery] = useState("");
  const [bookFilter, setBookFilter] = useState<string>("all");
  const [results, setResults] = useState<BibleSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
      setBookFilter("all");
    } else {
      setRecent(readRecentSearches());
    }
  }, [open]);

  const [localIndexSize, setLocalIndexSize] = useState(0);

  useEffect(() => {
    if (!open || !isCanonicalCsbBible(bibleId)) return;
    void countIndexedVerses(bibleId).then(setLocalIndexSize);
  }, [open, bibleId]);

  useEffect(() => {
    if (!open || !bibleId || query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const ref = parseBibleReference(query);
    if (ref) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      if (isCanonicalCsbBible(bibleId) && localIndexSize > 0) {
        try {
          const localHits = await searchCanonicalVerses(query.trim(), 40, bibleId);
          const mapped: BibleSearchHit[] = localHits.map((h: LocalVerseSearchHit) => ({
            reference: h.reference,
            book: h.bookAbbr,
            chapter: h.chapter,
            verse: h.verse,
            text: h.snippet,
          }));
          const filtered =
            bookFilter === "all" ? mapped : mapped.filter((h) => h.book === bookFilter);
          setResults(filtered);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Local search failed");
          setResults([]);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
        return;
      }

      if (!online) {
        setError(
          localIndexSize > 0
            ? "No local index for this translation yet. Read chapters while online to build it."
            : "Search requires an internet connection.",
        );
        setResults([]);
        setLoading(false);
        return;
      }

      searchBible(bibleId, query.trim(), 40, controller.signal)
        .then((hits) => {
          if (bookFilter === "all") return hits;
          return hits.filter((h) => h.book === bookFilter);
        })
        .then(setResults)
        .catch((err) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : "Search failed");
          setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, bibleId, query, online, bookFilter, localIndexSize]);

  if (!open) return null;

  const jumpToHit = (hit: BibleSearchHit) => {
    pushRecentSearch(query.trim() || hit.reference);
    const book = findBookByAbbr(hit.book);
    const abbr = book?.abbr ?? hit.book;
    onClose();
    navigate(`/read/${abbr}/${hit.chapter}?v=${hit.verse}`);
  };

  const jumpToReference = () => {
    const ref = parseBibleReference(query);
    if (!ref) return;
    pushRecentSearch(query.trim());
    onClose();
    const suffix = ref.verse ? `?v=${ref.verse}` : "";
    navigate(`/read/${ref.bookAbbr}/${ref.chapter}${suffix}`);
  };

  const parsedRef = looksLikeBibleReference(query) ? parseBibleReference(query) : null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/40 px-4 pt-[max(3rem,env(safe-area-inset-top))]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search Scripture"
        className="w-full max-w-lg rounded-2xl bg-background border shadow-xl overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && parsedRef) jumpToReference();
            }}
            placeholder="Search or type John 3:16…"
            className="border-0 shadow-none focus-visible:ring-0"
            aria-label="Search query"
          />
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close search">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Select value={bookFilter} onValueChange={setBookFilter}>
            <SelectTrigger className="h-8 text-xs" aria-label="Filter by book">
              <SelectValue placeholder="All books" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">All books</SelectItem>
              {BOOKS.map((b) => (
                <SelectItem key={b.abbr} value={b.abbr}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {parsedRef ? (
            <button
              type="button"
              onClick={jumpToReference}
              className="w-full text-left rounded-xl px-3 py-3 hover:bg-muted/60 transition border border-primary/20 bg-primary/5"
            >
              <div className="text-xs font-semibold text-primary">Go to reference</div>
              <p className="text-sm mt-0.5">
                {findBookByAbbr(parsedRef.bookAbbr)?.name ?? parsedRef.bookAbbr} {parsedRef.chapter}
                {parsedRef.verse ? `:${parsedRef.verse}` : ""}
              </p>
            </button>
          ) : null}

          {!query.trim() && recent.length > 0 ? (
            <div className="px-1 py-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1">
                Recent
              </p>
              {recent.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setQuery(r)}
                  className="w-full text-left rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  {r}
                </button>
              ))}
            </div>
          ) : null}

          {!online && !parsedRef && localIndexSize === 0 && (
            <p className="text-sm text-muted-foreground px-2 py-4">Connect to search Scripture.</p>
          )}
          {!online && !parsedRef && localIndexSize > 0 && query.trim().length < 2 && (
            <p className="text-sm text-muted-foreground px-2 py-4">
              Search your offline CSB index ({localIndexSize.toLocaleString()} verses indexed).
            </p>
          )}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Searching…
            </div>
          )}
          {error && !loading && (
            <p className="text-sm text-destructive px-2 py-4">{error}</p>
          )}
          {!loading && !error && !parsedRef && query.trim().length >= 2 && results.length === 0 && online && (
            <p className="text-sm text-muted-foreground px-2 py-4">No results for “{query.trim()}”.</p>
          )}
          {results.map((hit, i) => (
            <button
              key={`${hit.reference}-${i}`}
              type="button"
              onClick={() => jumpToHit(hit)}
              className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-muted/60 transition"
            >
              <div className="text-xs font-semibold text-primary">{hit.reference}</div>
              <p className="text-sm text-foreground/90 line-clamp-2 mt-0.5">{hit.text}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
