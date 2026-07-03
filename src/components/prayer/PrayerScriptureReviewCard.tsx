import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useBibles, pickDefaultBibleId } from "@/hooks/useBibles";
import { fetchPassage, listBibles, type Passage } from "@/lib/bible/api";
import { getStoredBibleId, LS_BIBLE_KEY } from "@/lib/bible/storedBibleId";
import { guessBookAbbr, guessChapter, readerPath } from "@/lib/bible/reference";
import { versesForRef } from "@/lib/prayer/verseTextForRef";
import { cn } from "@/lib/utils";

type Props = {
  reference: string;
  /** Start expanded for daily review. */
  defaultOpen?: boolean;
  onRemove?: () => void;
  className?: string;
};

export function PrayerScriptureReviewCard({
  reference,
  defaultOpen = false,
  onRemove,
  className,
}: Props) {
  const { data: bibles = [] } = useBibles();
  const bibleId = pickDefaultBibleId(bibles, getStoredBibleId()) ?? "";
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const book = guessBookAbbr(reference);
  const chapter = guessChapter(reference);
  const readerTo = readerPath(reference);

  const loadPassage = useCallback(async () => {
    if (passage || loading) return;
    setLoading(true);
    setError(null);
    try {
      let id = bibleId;
      if (!id) {
        const list = await listBibles();
        id = list[0]?.id ?? "";
        if (id) {
          try {
            localStorage.setItem(LS_BIBLE_KEY, id);
          } catch {
            /* ignore */
          }
        }
      }
      if (!id) throw new Error("Choose a translation in the Bible reader first.");
      const p = await fetchPassage(id, book, chapter);
      setPassage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [bibleId, book, chapter, loading, passage]);

  useEffect(() => {
    if (open) void loadPassage();
  }, [open, loadPassage]);

  const verses = passage ? versesForRef(passage, reference) : [];

  return (
    <li
      className={cn(
        "rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start gap-2 p-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="group inline-flex min-w-0 flex-1 items-start justify-between gap-2 text-left"
            >
              <span className="font-semibold text-sm leading-snug text-foreground">{reference}</span>
              {open ? (
                <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </button>
          </CollapsibleTrigger>
          <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" asChild>
            <Link to={readerTo} title="Open in Bible reader">
              Reader
              <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
            </Link>
          </Button>
          {onRemove ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              Remove
            </Button>
          ) : null}
        </div>

        <CollapsibleContent className="border-t border-border/40 px-3 pb-3 pt-2">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading verse…
            </p>
          ) : error ? (
            <p className="text-xs text-destructive leading-relaxed">{error}</p>
          ) : verses.length ? (
            <div className="space-y-1.5 text-sm leading-relaxed text-foreground">
              {verses.map((v) => (
                <p key={v.number}>
                  <span className="mr-1.5 tabular-nums text-[10px] font-medium text-muted-foreground">
                    {v.number}
                  </span>
                  {v.text}
                </p>
              ))}
            </div>
          ) : passage ? (
            <p className="text-xs text-muted-foreground">No verses matched this reference.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Tap to load verse text.</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

type ListProps = {
  refs: string[];
  /** Expand all cards — useful for daily review on the detail page. */
  expandAll?: boolean;
  onRemove?: (ref: string) => void;
  className?: string;
};

export function PrayerScriptureReviewList({
  refs,
  expandAll = false,
  onRemove,
  className,
}: ListProps) {
  if (refs.length === 0) return null;

  return (
    <ul className={cn("space-y-2", className)}>
      {refs.map((ref) => (
        <PrayerScriptureReviewCard
          key={ref}
          reference={ref}
          defaultOpen={expandAll}
          onRemove={onRemove ? () => onRemove(ref) : undefined}
        />
      ))}
    </ul>
  );
}
