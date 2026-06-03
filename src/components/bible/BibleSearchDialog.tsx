import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchBible, type BibleSearchHit } from "@/lib/bible/api";
import { findBookByAbbr } from "@/data/books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [results, setResults] = useState<BibleSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !bibleId || query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    if (!online) {
      setError("Search requires an internet connection.");
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      searchBible(bibleId, query.trim(), 25, controller.signal)
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
  }, [open, bibleId, query, online]);

  if (!open) return null;

  const jumpTo = (hit: BibleSearchHit) => {
    const book = findBookByAbbr(hit.book);
    const abbr = book?.abbr ?? hit.book;
    onClose();
    navigate(`/read/${abbr}/${hit.chapter}?v=${hit.verse}`);
  };

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
            placeholder="Search the Bible…"
            className="border-0 shadow-none focus-visible:ring-0"
            aria-label="Search query"
          />
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close search">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {!online && (
            <p className="text-sm text-muted-foreground px-2 py-4">Connect to search Scripture.</p>
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
          {!loading && !error && query.trim().length >= 2 && results.length === 0 && online && (
            <p className="text-sm text-muted-foreground px-2 py-4">No results for “{query.trim()}”.</p>
          )}
          {results.map((hit, i) => (
            <button
              key={`${hit.reference}-${i}`}
              type="button"
              onClick={() => jumpTo(hit)}
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
