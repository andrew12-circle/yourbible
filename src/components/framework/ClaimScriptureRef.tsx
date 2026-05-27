import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { fetchPassage, listBibles, type Passage } from "@/lib/bible/api";
import { getStoredBibleId, LS_BIBLE_KEY } from "@/lib/bible/storedBibleId";
import { guessBookAbbr, guessChapter, guessVerseEnd, guessVerseStart, readerPath } from "@/lib/bible/reference";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function versesForRef(passage: Passage, ref: string) {
  const start = guessVerseStart(ref);
  const end = guessVerseEnd(ref) ?? start;
  return passage.verses.filter((v) => v.number >= start && v.number <= end);
}

interface ClaimScriptureRefProps {
  reference: string;
  note?: string;
  /** Tighter card for horizontal claim rails. */
  compact?: boolean;
  className?: string;
}

export default function ClaimScriptureRef({
  reference,
  note,
  compact = false,
  className,
}: ClaimScriptureRefProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readerTo = readerPath(reference);
  const book = guessBookAbbr(reference);
  const chapter = guessChapter(reference);

  const loadPassage = useCallback(async () => {
    if (passage || loading) return;
    setLoading(true);
    setError(null);
    try {
      let bibleId = getStoredBibleId();
      if (!bibleId) {
        const bibles = await listBibles();
        bibleId = bibles[0]?.id ?? "";
        if (bibleId) {
          try {
            localStorage.setItem(LS_BIBLE_KEY, bibleId);
          } catch {
            /* ignore */
          }
        }
      }
      if (!bibleId) throw new Error("Choose a translation in the Bible reader first.");
      const p = await fetchPassage(bibleId, book, chapter);
      setPassage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [book, chapter, loading, passage]);

  useEffect(() => {
    if (open) void loadPassage();
  }, [open, loadPassage]);

  const verses = passage ? versesForRef(passage, reference) : [];

  return (
    <li
      className={cn(
        compact
          ? "rounded-2xl border border-border/55 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)]"
          : "rounded-2xl border border-border/50 bg-white/90 shadow-[0_12px_34px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02]",
        className,
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className={cn("flex items-start gap-2.5", compact ? "p-3" : "p-4")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <BookOpen className="h-5 w-5" aria-hidden />
          </span>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="group inline-flex min-w-0 flex-1 items-start justify-between gap-2 text-left text-foreground"
            >
              <span className={cn("font-semibold leading-snug", compact ? "text-sm" : "text-base")}>
                {reference}
              </span>
              {open ? (
                <ChevronUp
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 transition group-hover:translate-y-[-1px]"
                  aria-hidden
                />
              ) : (
                <ChevronDown
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 transition group-hover:translate-y-0.5"
                  aria-hidden
                />
              )}
            </button>
          </CollapsibleTrigger>
          <Button
            size="sm"
            variant="ghost"
            className="hidden h-8 shrink-0 rounded-full px-2.5 text-xs text-blue-700 hover:bg-blue-50 sm:inline-flex"
            asChild
          >
            <Link to={readerTo} title="Open in Bible reader">
              Reader
              <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
            </Link>
          </Button>
        </div>
        {note ? (
          <p className={cn("leading-relaxed text-muted-foreground", compact ? "px-3 pb-3 text-xs" : "px-4 pb-4 text-sm")}>
            {note}
          </p>
        ) : null}
        <CollapsibleContent className={cn("border-t border-border/40", compact ? "px-3 pb-3 pt-3" : "px-4 pb-4 pt-3")}>
          {loading ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading passage…
            </p>
          ) : error ? (
            <p className="text-destructive text-[11px] leading-relaxed">{error}</p>
          ) : verses.length ? (
            <div className="space-y-1.5 font-sans text-sm leading-relaxed text-foreground">
              {verses.map((v) => (
                <p key={v.number}>
                  <span className="mr-1.5 tabular-nums text-[10px] font-medium text-muted-foreground">{v.number}</span>
                  {v.text}
                </p>
              ))}
            </div>
          ) : passage ? (
            <p className="text-muted-foreground text-[11px]">No verses matched this reference range.</p>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
