import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Crown, Heart, Library, ShieldCheck, Sparkles } from "lucide-react";
import { BookScene } from "@/components/bible/BookScene";
import { PageFlip } from "@/components/bible/PageFlip";
import { SwipePage } from "@/components/bible/SwipePage";
import { useReaderCompactChrome, useReaderSpread } from "@/hooks/use-reader-layout";
import type { ChildrenBook, ChildrenBookPage, ChildrenBookSymbol } from "@/lib/children-books/storybook";
import { cn } from "@/lib/utils";

type ChildrenBookReaderProps = {
  book: ChildrenBook;
  showHubShell: boolean;
  onBackToLibrary: () => void;
};

type TurnDirection = "forward" | "back";

const paletteClasses: Record<ChildrenBookPage["palette"], string> = {
  dawn: "from-amber-100 via-rose-50 to-sky-100",
  garden: "from-emerald-100 via-lime-50 to-rose-100",
  royal: "from-violet-100 via-amber-50 to-rose-100",
  starlight: "from-indigo-100 via-sky-50 to-amber-100",
};

const symbolClasses: Record<ChildrenBookSymbol, string> = {
  crown: "bg-amber-500 text-white shadow-amber-900/20",
  heart: "bg-rose-500 text-white shadow-rose-900/20",
  light: "bg-sky-500 text-white shadow-sky-900/20",
  shield: "bg-emerald-500 text-white shadow-emerald-900/20",
};

function StorySymbol({ symbol, className }: { symbol: ChildrenBookSymbol; className?: string }) {
  const iconClass = "h-8 w-8";
  const icons = {
    crown: <Crown className={iconClass} aria-hidden />,
    heart: <Heart className={iconClass} aria-hidden />,
    light: <Sparkles className={iconClass} aria-hidden />,
    shield: <ShieldCheck className={iconClass} aria-hidden />,
  } satisfies Record<ChildrenBookSymbol, JSX.Element>;

  return (
    <span
      className={cn(
        "inline-flex h-16 w-16 items-center justify-center rounded-full shadow-lg",
        symbolClasses[symbol],
        className,
      )}
    >
      {icons[symbol]}
    </span>
  );
}

function StoryPageFace({ page }: { page: ChildrenBookPage }) {
  return (
    <article className="relative flex h-full min-h-0 flex-col overflow-hidden bg-paper px-5 pb-8 pt-8 sm:px-7">
      <div
        className={cn(
          "flex min-h-[10rem] flex-1 flex-col items-center justify-center overflow-hidden rounded-[1.25rem] border border-white/70 bg-gradient-to-br p-5 text-center shadow-inner",
          paletteClasses[page.palette],
        )}
      >
        <StorySymbol symbol={page.symbol} />
        <h2 className="mt-5 font-display text-2xl leading-tight text-leather sm:text-3xl">
          {page.title}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-leather/75">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-leather/50">
            Scene
          </span>
          <span className="mt-1 block">{page.picturePrompt}</span>
        </p>
      </div>

      <div className="shrink-0 pt-5">
        <p className="font-display text-lg leading-snug text-foreground sm:text-xl">
          {page.body}
        </p>
      </div>
    </article>
  );
}

function EndPageFace({ book }: { book: ChildrenBook }) {
  return (
    <article className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-paper px-8 pb-16 text-center">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-[2rem] shadow-lg"
        style={{ background: book.coverGradient }}
      >
        <Sparkles className="h-11 w-11 text-white" aria-hidden />
      </div>
      <h2 className="mt-6 font-display text-3xl text-leather">The end</h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {book.title}
      </p>
    </article>
  );
}

export function ChildrenBookReader({ book, showHubShell, onBackToLibrary }: ChildrenBookReaderProps) {
  const readerSpread = useReaderSpread();
  const compactChrome = useReaderCompactChrome();
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<TurnDirection>("forward");

  const effectiveSpread = readerSpread && !compactChrome;
  const spreadStep = effectiveSpread ? 2 : 1;
  const visiblePageIndex = effectiveSpread ? Math.floor(pageIndex / 2) * 2 : pageIndex;
  const rightPageIndex = effectiveSpread ? visiblePageIndex + 1 : visiblePageIndex + 1;
  const canGoBack = visiblePageIndex > 0;
  const canGoForward = visiblePageIndex + spreadStep < book.pages.length;
  const progress = book.pages.length <= 1 ? 0 : visiblePageIndex / (book.pages.length - 1);

  useEffect(() => {
    setPageIndex(0);
    setDirection("forward");
  }, [book.slug]);

  const turnPage = useCallback(
    (nextDirection: TurnDirection) => {
      setDirection(nextDirection);
      setPageIndex((current) => {
        const next = nextDirection === "forward" ? current + spreadStep : current - spreadStep;
        return Math.min(Math.max(next, 0), book.pages.length - 1);
      });
    },
    [book.pages.length, spreadStep],
  );

  const handleSwipeTurn = useCallback(
    (delta: 1 | -1) => {
      if (delta === 1 && canGoForward) turnPage("forward");
      if (delta === -1 && canGoBack) turnPage("back");
    },
    [canGoBack, canGoForward, turnPage],
  );

  const leftStoryPage = book.pages[visiblePageIndex] ?? book.pages[0]!;

  return (
    <div
      className={cn(
        "group/reader relative flex min-h-0 flex-col overflow-hidden bg-fabric",
        showHubShell ? "h-full" : "h-[100dvh]",
      )}
    >
      <button
        type="button"
        onClick={onBackToLibrary}
        aria-label="Back to library"
        className={cn(
          "absolute left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full",
          "text-leather/50 opacity-0 transition hover:bg-white/60 hover:text-leather",
          "group-hover/reader:opacity-100 focus-visible:opacity-100",
        )}
      >
        <Library className="h-4 w-4" aria-hidden />
      </button>

      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden p-3 lg:p-4">
        <section className="relative mx-auto h-full min-h-[34rem] max-w-5xl overflow-hidden rounded-2xl border border-white/50 bg-white/35 shadow-soft">
          <BookScene
            progress={progress}
            leftPage={
              <SwipePage side="left" onTurn={handleSwipeTurn}>
                <PageFlip
                  pageKey={`${book.slug}-${visiblePageIndex}`}
                  direction={direction}
                  side="left"
                  enableSlide={!effectiveSpread}
                >
                  <StoryPageFace page={leftStoryPage} />
                </PageFlip>
              </SwipePage>
            }
            rightPage={
              <SwipePage side="right" onTurn={handleSwipeTurn}>
                <PageFlip
                  pageKey={`${book.slug}-${rightPageIndex}`}
                  direction={direction}
                  side="right"
                  enableSlide={false}
                >
                  {book.pages[rightPageIndex] ? (
                    <StoryPageFace page={book.pages[rightPageIndex]!} />
                  ) : (
                    <EndPageFace book={book} />
                  )}
                </PageFlip>
              </SwipePage>
            }
            singlePage={!effectiveSpread}
            fillContainer
            fabricSurround
            hubInline={showHubShell}
            coverStyle={{
              "--lc-base": "28 35% 20%",
              "--lc-dark": "24 45% 13%",
              "--lc-light": "34 38% 33%",
              "--lc-highlight": "42 62% 58%",
              "--lc-border": "25 28% 9%",
            } as CSSProperties}
            coverClassName="leather-cover--foil-gold"
            pageClassName="reader-page-cream"
          />

          <button
            type="button"
            onClick={() => turnPage("back")}
            disabled={!canGoBack}
            aria-label="Previous page"
            className={cn(
              "absolute inset-y-0 left-0 z-20 flex w-[min(18%,5rem)] items-center justify-start pl-2",
              "text-leather/40 opacity-0 transition disabled:pointer-events-none",
              "hover:text-leather/70 group-hover/reader:opacity-100 focus-visible:opacity-100",
              !canGoBack && "opacity-0",
            )}
          >
            <ChevronLeft className="h-7 w-7 drop-shadow-sm" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => turnPage("forward")}
            disabled={!canGoForward}
            aria-label="Next page"
            className={cn(
              "absolute inset-y-0 right-0 z-20 flex w-[min(18%,5rem)] items-center justify-end pr-2",
              "text-leather/40 opacity-0 transition disabled:pointer-events-none",
              "hover:text-leather/70 group-hover/reader:opacity-100 focus-visible:opacity-100",
              !canGoForward && "opacity-0",
            )}
          >
            <ChevronRight className="h-7 w-7 drop-shadow-sm" aria-hidden />
          </button>
        </section>
      </main>
    </div>
  );
}
