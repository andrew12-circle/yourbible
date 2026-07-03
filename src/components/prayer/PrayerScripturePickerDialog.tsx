import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBibles, pickDefaultBibleId } from "@/hooks/useBibles";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { searchBible, type BibleSearchHit } from "@/lib/bible/api";
import { getStoredBibleId } from "@/lib/bible/storedBibleId";
import { looksLikeBibleReference, parseBibleReference } from "@/lib/bible/parseBibleReference";
import { findBookByAbbr } from "@/data/books";
import {
  filterProvisionScriptures,
  PROVISION_SCRIPTURE_CATEGORIES,
  type ProvisionScriptureCategory,
} from "@/lib/prayer/provisionScriptures";
import { loadVerseTextsForRefs } from "@/lib/prayer/verseTextForRef";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRefs: string[];
  onSelect: (ref: string) => void;
};

function normalizeRef(ref: string): string {
  return ref.trim().toLowerCase();
}

export default function PrayerScripturePickerDialog({
  open,
  onOpenChange,
  selectedRefs,
  onSelect,
}: Props) {
  const online = useOnlineStatus();
  const { data: bibles = [] } = useBibles();
  const bibleId = pickDefaultBibleId(bibles, getStoredBibleId()) ?? "";

  const [category, setCategory] = useState<ProvisionScriptureCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BibleSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [verseTexts, setVerseTexts] = useState<Map<string, string>>(new Map());
  const [textsLoading, setTextsLoading] = useState(false);

  const selectedSet = useMemo(
    () => new Set(selectedRefs.map(normalizeRef)),
    [selectedRefs],
  );

  const curated = useMemo(
    () => filterProvisionScriptures(category, query),
    [category, query],
  );

  const isSearching = query.trim().length >= 2 && !looksLikeBibleReference(query);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCategory("all");
      setSearchResults([]);
      setSearchError(null);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !bibleId || curated.length === 0 || isSearching) return;
    const refs = curated.map((e) => e.ref);
    let cancelled = false;
    setTextsLoading(true);
    void loadVerseTextsForRefs(bibleId, refs).then((map) => {
      if (cancelled) return;
      setVerseTexts((prev) => {
        const next = new Map(prev);
        for (const [ref, text] of map) next.set(ref, text);
        return next;
      });
      setTextsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, bibleId, curated, isSearching]);

  useEffect(() => {
    if (!open || !bibleId || !isSearching || !online) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError(null);
      void searchBible(bibleId, query.trim(), 30, controller.signal)
        .then(setSearchResults)
        .catch((err) => {
          if (controller.signal.aborted) return;
          setSearchError(err instanceof Error ? err.message : "Search failed");
          setSearchResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false);
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, bibleId, query, isSearching, online]);

  const pickRef = useCallback(
    (ref: string) => {
      onSelect(ref.trim());
    },
    [onSelect],
  );

  const parsedRef = looksLikeBibleReference(query) ? parseBibleReference(query) : null;

  const formatParsedRef = (ref: NonNullable<typeof parsedRef>) => {
    const bookName = findBookByAbbr(ref.bookAbbr)?.name ?? ref.bookAbbr;
    return `${bookName} ${ref.chapter}${ref.verse ? `:${ref.verse}` : ""}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden />
            Choose scriptures to stand on
          </DialogTitle>
          <DialogDescription>
            Browse provision and faith verses with full text — select what you are calling in.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or type Philippians 4:19…"
              className="pl-9"
            />
          </div>

          {!isSearching ? (
            <div className="flex flex-wrap gap-1.5">
              {PROVISION_SCRIPTURE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition",
                    category === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t px-3 py-2 space-y-2">
          {parsedRef ? (
            <button
              type="button"
              onClick={() => pickRef(formatParsedRef(parsedRef))}
              className="w-full rounded-xl border border-primary/25 bg-primary/5 px-3 py-3 text-left hover:bg-primary/10 transition"
            >
              <div className="text-xs font-semibold text-primary">Add this reference</div>
              <p className="text-sm mt-0.5">{formatParsedRef(parsedRef)}</p>
            </button>
          ) : null}

          {isSearching ? (
            <>
              {searchLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Searching Scripture…
                </div>
              ) : null}
              {searchError ? (
                <p className="text-sm text-destructive px-2 py-4">{searchError}</p>
              ) : null}
              {!searchLoading && !searchError && searchResults.length === 0 && online ? (
                <p className="text-sm text-muted-foreground px-2 py-4">
                  No results for &ldquo;{query.trim()}&rdquo;.
                </p>
              ) : null}
              {!online ? (
                <p className="text-sm text-muted-foreground px-2 py-4">
                  Connect to search Scripture by keyword.
                </p>
              ) : null}
              {searchResults.map((hit, i) => {
                const picked = selectedSet.has(normalizeRef(hit.reference));
                return (
                  <ScripturePickRow
                    key={`${hit.reference}-${i}`}
                    refText={hit.reference}
                    body={hit.text}
                    picked={picked}
                    onPick={() => pickRef(hit.reference)}
                  />
                );
              })}
            </>
          ) : (
            <>
              {textsLoading && curated.length > 0 ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Loading verse text…
                </div>
              ) : null}
              {curated.map((entry) => {
                const picked = selectedSet.has(normalizeRef(entry.ref));
                const body = verseTexts.get(entry.ref);
                return (
                  <ScripturePickRow
                    key={entry.ref}
                    refText={entry.ref}
                    subtitle={entry.theme}
                    body={body}
                    picked={picked}
                    onPick={() => pickRef(entry.ref)}
                  />
                );
              })}
              {curated.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2 py-6 text-center">
                  No scriptures match this filter.
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="border-t px-5 py-3">
          <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScripturePickRow({
  refText,
  subtitle,
  body,
  picked,
  onPick,
}: {
  refText: string;
  subtitle?: string;
  body?: string;
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "w-full rounded-xl border px-3 py-3 text-left transition",
        picked
          ? "border-primary/40 bg-primary/5"
          : "border-border/60 hover:border-border hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{refText}</div>
          {subtitle ? (
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          ) : null}
        </div>
        {picked ? (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-medium text-muted-foreground">
            +
          </span>
        )}
      </div>
      {body ? (
        <p className="mt-2 text-sm leading-relaxed text-foreground/90 line-clamp-4">{body}</p>
      ) : null}
    </button>
  );
}
