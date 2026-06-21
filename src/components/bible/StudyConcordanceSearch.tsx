import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchBible, type BibleSearchHit } from "@/lib/bible/api";
import { findBookByAbbr } from "@/data/books";
import { looksLikeBibleReference, parseBibleReference } from "@/lib/bible/parseBibleReference";
import { Input } from "@/components/ui/input";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type Props = {
  bibleId: string;
};

/** Concordance-style word search for study back matter. */
export function StudyConcordanceSearch({ bibleId }: Props) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BibleSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bibleId || query.trim().length < 2) {
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

    if (!online) {
      setError("Connect to search Scripture.");
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      searchBible(bibleId, query.trim(), 50, controller.signal)
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
  }, [bibleId, query, online]);

  const parsedRef = looksLikeBibleReference(query) ? parseBibleReference(query) : null;

  const jumpToHit = (hit: BibleSearchHit) => {
    const book = findBookByAbbr(hit.book);
    navigate(`/read/${book?.abbr ?? hit.book}/${hit.chapter}?v=${hit.verse}`);
  };

  const jumpToReference = () => {
    const ref = parseBibleReference(query);
    if (!ref) return;
    const suffix = ref.verse ? `?v=${ref.verse}` : "";
    navigate(`/read/${ref.bookAbbr}/${ref.chapter}${suffix}`);
  };

  return (
    <div className="study-concordance mt-4">
      <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background/80">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && parsedRef) jumpToReference();
          }}
          placeholder="Word or phrase (e.g. shepherd, faith)…"
          className="border-0 shadow-none focus-visible:ring-0 h-8"
          aria-label="Concordance search"
        />
      </div>

      {parsedRef ? (
        <button
          type="button"
          onClick={jumpToReference}
          className="mt-3 w-full text-left rounded-lg px-3 py-2 border border-primary/20 bg-primary/5 hover:bg-primary/10 transition text-sm"
        >
          Go to {findBookByAbbr(parsedRef.bookAbbr)?.name ?? parsedRef.bookAbbr} {parsedRef.chapter}
          {parsedRef.verse ? `:${parsedRef.verse}` : ""}
        </button>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground justify-center">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Searching…
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}

      {!loading && !error && !parsedRef && query.trim().length >= 2 && results.length === 0 && online ? (
        <p className="text-sm text-muted-foreground mt-3">No results for “{query.trim()}”.</p>
      ) : null}

      <ul className="mt-3 space-y-1 max-h-[min(50vh,360px)] overflow-y-auto">
        {results.map((hit, i) => (
          <li key={`${hit.reference}-${i}`}>
            <button
              type="button"
              onClick={() => jumpToHit(hit)}
              className="w-full text-left rounded-lg px-2 py-2 hover:bg-muted/60 transition text-sm"
            >
              <span className="text-xs font-semibold text-primary">{hit.reference}</span>
              <p className="text-foreground/90 line-clamp-2 mt-0.5">{hit.text}</p>
            </button>
          </li>
        ))}
      </ul>

      {!online && !parsedRef && query.trim().length >= 2 ? (
        <p className="text-sm text-muted-foreground mt-3">Concordance search requires an internet connection.</p>
      ) : null}
    </div>
  );
}
