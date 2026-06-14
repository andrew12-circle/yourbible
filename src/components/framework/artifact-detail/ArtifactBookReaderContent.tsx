import { useMemo, useRef } from "react";
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
  title: string;
  author?: string | null;
  rawText: string;
  chapters?: YoutubeChapter[];
  className?: string;
  scrollClassName?: string;
};

export default function ArtifactBookReaderContent({
  title,
  author = null,
  rawText,
  chapters = [],
  className,
  scrollClassName,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const paragraphs = useMemo(() => splitReaderParagraphs(rawText), [rawText]);

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
    <div className={cn("flex min-h-0 flex-1", className)}>
      {chapterMarkers.length > 0 ? (
        <aside className="hidden w-44 shrink-0 border-r border-border/60 bg-muted/20 lg:w-52">
          <ScrollArea className="h-full">
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

      <ScrollArea className={cn("min-h-0 flex-1", scrollClassName)}>
        <article ref={scrollRef} className="mx-auto max-w-prose px-5 py-6 sm:px-8 sm:py-8">
          <header className="mb-6 border-b border-border/50 pb-4 lg:hidden">
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            {author ? <p className="mt-1 text-sm text-muted-foreground">{author}</p> : null}
          </header>
          {chapterMarkers.length > 0
            ? chapterMarkers.map(({ index, chapter, paragraphIndex }) => (
                <div key={`${chapter.start_seconds}-${index}`}>
                  <h3
                    id={chapterAnchorId(index)}
                    className="mb-4 scroll-mt-6 font-display text-xl font-semibold tracking-tight text-foreground first:mt-0"
                  >
                    {chapter.title}
                  </h3>
                  {paragraphs
                    .slice(paragraphIndex, chapterMarkers[index + 1]?.paragraphIndex ?? paragraphs.length)
                    .map((p) => (
                      <p
                        key={`${index}-${p.slice(0, 40)}`}
                        className="mb-4 text-[15px] leading-relaxed text-foreground/90"
                      >
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
  );
}
