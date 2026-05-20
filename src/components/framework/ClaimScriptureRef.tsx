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
  className?: string;
}

export default function ClaimScriptureRef({ reference, note, className }: ClaimScriptureRefProps) {
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
    <li className={cn("rounded-md border border-border/50 bg-background/40", className)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-wrap items-start gap-2 p-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex min-w-0 flex-1 items-start gap-1.5 text-left text-foreground hover:underline underline-offset-2"
            >
              <span className="font-medium">{reference}</span>
              {open ? (
                <ChevronUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </button>
          </CollapsibleTrigger>
          <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" asChild>
            <Link to={readerTo} title="Open in Bible reader">
              <BookOpen className="mr-1 h-3 w-3" />
              Reader
              <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
            </Link>
          </Button>
        </div>
        {note ? <p className="px-2 pb-1 text-muted-foreground">{note}</p> : null}
        <CollapsibleContent className="border-t border-border/40 px-2 pb-2 pt-2">
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
