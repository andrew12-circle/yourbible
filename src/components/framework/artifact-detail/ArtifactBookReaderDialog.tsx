import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { YoutubeChapter } from "@/lib/youtubeChapters";

function splitReaderParagraphs(rawText: string): string[] {
  return rawText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function chapterAnchorId(index: number): string {
  return `book-reader-chapter-${index}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  author?: string | null;
  rawText: string;
  chapters?: YoutubeChapter[];
  /** Jump to this chapter index when opening. */
  initialChapterIndex?: number | null;
};

export default function ArtifactBookReaderDialog({
  open,
  onOpenChange,
  title,
  author = null,
  rawText,
  chapters = [],
  initialChapterIndex = null,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const paragraphs = useMemo(() => splitReaderParagraphs(rawText), [rawText]);

  useEffect(() => {
    if (!open || initialChapterIndex == null || initialChapterIndex < 0) return;
    const id = chapterAnchorId(initialChapterIndex);
    const t = window.setTimeout(() => {
      scrollRef.current
        ?.querySelector(`#${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [open, initialChapterIndex]);

  const chapterMarkers = useMemo(() => {
    if (chapters.length === 0) return [];
    return chapters.map((ch, index) => {
      const needle = ch.title.trim().toLowerCase();
      let paragraphIndex = 0;
      if (needle.length >= 3) {
        const found = paragraphs.findIndex((p) => p.toLowerCase().includes(needle));
        if (found >= 0) paragraphIndex = found;
      }
      return { index, chapter: ch, paragraphIndex };
    });
  }, [chapters, paragraphs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,900px)] w-[min(96vw,920px)] flex-col gap-0 overflow-hidden p-0",
          "sm:max-w-[920px]",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-6">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle className="line-clamp-2 font-display text-xl tracking-tight">{title}</DialogTitle>
              {author ? (
                <DialogDescription className="mt-0.5">{author}</DialogDescription>
              ) : (
                <DialogDescription className="sr-only">Book reader</DialogDescription>
              )}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-3 top-3 shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label="Close reader"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {chapterMarkers.length > 0 ? (
            <aside className="hidden w-52 shrink-0 border-r border-border/60 bg-muted/20 sm:block">
              <ScrollArea className="h-[min(72vh,760px)]">
                <nav className="space-y-0.5 p-3" aria-label="Chapters">
                  {chapterMarkers.map(({ index, chapter }) => (
                    <button
                      key={`${chapter.start_seconds}-${chapter.title}`}
                      type="button"
                      className="w-full rounded-lg px-2.5 py-2 text-left text-xs leading-snug text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                      onClick={() => {
                        scrollRef.current
                          ?.querySelector(`#${chapterAnchorId(index)}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      <span className="line-clamp-2 font-medium text-foreground">{chapter.title}</span>
                    </button>
                  ))}
                </nav>
              </ScrollArea>
            </aside>
          ) : null}

          <ScrollArea className="min-h-0 flex-1">
            <article
              ref={scrollRef}
              className="mx-auto max-w-prose px-5 py-8 sm:px-10 sm:py-10"
            >
              {chapterMarkers.length > 0
                ? chapterMarkers.map(({ index, chapter, paragraphIndex }) => (
                    <div key={`${chapter.start_seconds}-${index}`}>
                      <h2
                        id={chapterAnchorId(index)}
                        className="mb-4 scroll-mt-6 font-display text-xl font-semibold tracking-tight text-foreground first:mt-0"
                      >
                        {chapter.title}
                      </h2>
                      {paragraphs.slice(
                        paragraphIndex,
                        chapterMarkers[index + 1]?.paragraphIndex ?? paragraphs.length,
                      ).map((p) => (
                        <p key={`${index}-${p.slice(0, 40)}`} className="mb-4 text-[15px] leading-relaxed text-foreground/90">
                          {p}
                        </p>
                      ))}
                    </div>
                  ))
                : paragraphs.map((p, i) => (
                    <p key={i} className="mb-4 text-[15px] leading-relaxed text-foreground/90">
                      {p}
                    </p>
                  ))}
            </article>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
