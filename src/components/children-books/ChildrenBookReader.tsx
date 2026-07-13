import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { ChevronLeft, ChevronRight, ImageIcon, Library, Sparkles } from "lucide-react";

import { BookScene } from "@/components/bible/BookScene";
import { PageFlip } from "@/components/bible/PageFlip";
import { SwipePage } from "@/components/bible/SwipePage";
import { ChildrenBookOrnamentPage } from "@/components/children-books/ChildrenBookArtPage";
import { ChildrenBookCoverSpread } from "@/components/children-books/ChildrenBookCoverSpread";
import { ChildrenBookStoryPage } from "@/components/children-books/ChildrenBookStoryPage";
import { ChildrenBookGoldFlourish } from "@/components/children-books/ChildrenBookGoldFlourish";
import { SpreadPageSpineShade } from "@/components/children-books/SpreadPageSpineShade";
import { childrenBookBodyClassName } from "@/lib/children-books/childrenBookTypography";
import { PageIllustrationSheet } from "@/components/children-books/PageIllustrationSheet";
import { useGeneratePageIllustration } from "@/hooks/useGeneratePageIllustration";
import { usePageImageLoaded } from "@/hooks/usePageImageUrl";
import { useIsTabletPortrait, useReaderCompactChrome, useReaderSpread } from "@/hooks/use-reader-layout";
import { childrenBookPagePadding } from "@/lib/children-books/pageMargins";
import {
  childrenBookSpreadCount,
  leftStoryPageIndex,
  rightStoryPageIndex,
  storyPageNumber,
} from "@/lib/children-books/spreadPagination";
import type { ChildrenBook, ChildrenBookPage } from "@/lib/children-books/storybook";
import { resolvePageLayout } from "@/lib/children-books/storybook";
import { cn } from "@/lib/utils";

type ChildrenBookReaderProps = {
  book: ChildrenBook;
  showHubShell: boolean;
  onBackToLibrary: () => void;
};

type TurnDirection = "forward" | "back";

function StoryPageFace({
  book,
  page,
  pageIndex,
  side,
  singlePage,
  compactChrome,
  onOpenIllustration,
}: {
  book: ChildrenBook;
  page: ChildrenBookPage;
  pageIndex: number;
  side: "left" | "right";
  singlePage: boolean;
  compactChrome: boolean;
  onOpenIllustration: () => void;
}) {
  const pageNumber = storyPageNumber(pageIndex);
  const layout = resolvePageLayout(page, pageIndex);
  const autoGenerate = !book.useDefaultImagePaths;
  const { imageUrl, generating } = useGeneratePageIllustration(book, page, pageNumber, { auto: autoGenerate });
  const { loaded, failed, onLoad, onError } = usePageImageLoaded(imageUrl);

  return (
    <ChildrenBookStoryPage
      page={page}
      layout={layout}
      side={side}
      singlePage={singlePage}
      compactChrome={compactChrome}
      imageUrl={imageUrl}
      loaded={loaded}
      failed={failed}
      generating={generating}
      onLoad={onLoad}
      onError={onError}
      onOpenIllustration={onOpenIllustration}
    />
  );
}

function EndPageFace({
  book,
  side,
  singlePage,
  compactChrome,
}: {
  book: ChildrenBook;
  side: "left" | "right";
  singlePage: boolean;
  compactChrome: boolean;
}) {
  return (
    <article
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#faf6ee_0%,#f3ecdf_100%)] text-center"
      style={childrenBookPagePadding(side, "text", singlePage, compactChrome)}
    >
      <SpreadPageSpineShade side={side} spread={!singlePage} />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-2 py-8 sm:py-10">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] shadow-lg sm:h-24 sm:w-24"
          style={{ background: book.coverGradient }}
        >
          <Sparkles className="h-9 w-9 text-white sm:h-11 sm:w-11" aria-hidden />
        </div>
        <h2 className="mt-5 font-display text-2xl text-leather sm:mt-6 sm:text-3xl">The end</h2>
        <ChildrenBookGoldFlourish className="mt-4" />
        <p
          className={cn(
            "mt-5 max-w-md text-left font-serif italic text-foreground/88",
            childrenBookBodyClassName(book.closingPrayer),
          )}
        >
          {book.closingPrayer}
        </p>
        <p className="mt-6 max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">{book.title}</p>
      </div>
    </article>
  );
}

export function ChildrenBookReader({ book, showHubShell, onBackToLibrary }: ChildrenBookReaderProps) {
  const readerSpread = useReaderSpread();
  const compactChrome = useReaderCompactChrome();
  const tabletPortrait = useIsTabletPortrait();
  const [showCover, setShowCover] = useState(true);
  const [openingCover, setOpeningCover] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<TurnDirection>("forward");
  const [illustrationOpen, setIllustrationOpen] = useState(false);

  const effectiveSpread = readerSpread;
  const singlePage = !effectiveSpread;
  const spreadCount = childrenBookSpreadCount(book.pages);
  const isEndSpread = !showCover && !singlePage && pageIndex >= spreadCount;
  const isEndPage = !showCover && singlePage && pageIndex >= book.pages.length;

  const leftStoryIndex = singlePage ? pageIndex : leftStoryPageIndex(pageIndex);
  const rightStoryIndex = singlePage ? null : rightStoryPageIndex(pageIndex, book.pages.length);

  const leftPage = book.pages[leftStoryIndex] ?? null;
  const rightPage = rightStoryIndex !== null ? (book.pages[rightStoryIndex] ?? null) : null;

  const illustrationPageIndex = leftStoryIndex;
  const illustrationPage = leftPage ?? rightPage;
  const illustrationPageNumber = illustrationPage ? storyPageNumber(illustrationPageIndex) : 1;

  const canGoBack = showCover ? false : pageIndex > 0;
  const canGoForward = singlePage
    ? !showCover && pageIndex < book.pages.length
    : !showCover && pageIndex < spreadCount;

  const progress = showCover
    ? 0
    : singlePage
      ? book.pages.length <= 0
        ? 0
        : Math.min((pageIndex + 1) / (book.pages.length + 1), 1)
      : spreadCount <= 0
        ? 0
        : Math.min((pageIndex + 1) / (spreadCount + 1), 1);

  useEffect(() => {
    setShowCover(true);
    setOpeningCover(false);
    setPageIndex(0);
    setDirection("forward");
  }, [book.slug]);

  const openBook = useCallback(() => {
    if (openingCover || !showCover) return;
    setOpeningCover(true);
    window.setTimeout(() => {
      setShowCover(false);
      setOpeningCover(false);
      setDirection("forward");
      setPageIndex(0);
    }, 320);
  }, [openingCover, showCover]);

  const turnPage = useCallback(
    (nextDirection: TurnDirection) => {
      if (showCover) {
        if (nextDirection === "forward") openBook();
        return;
      }

      setDirection(nextDirection);
      setPageIndex((current) => {
        if (nextDirection === "back" && current === 0) {
          setShowCover(true);
          return 0;
        }

        const maxIndex = singlePage ? book.pages.length : spreadCount;
        const next = nextDirection === "forward" ? current + 1 : current - 1;
        return Math.min(Math.max(next, 0), maxIndex);
      });
    },
    [book.pages.length, openBook, showCover, singlePage, spreadCount],
  );

  const handleSwipeTurn = useCallback(
    (delta: 1 | -1) => {
      if (showCover) {
        if (delta === 1) openBook();
        return;
      }
      if (delta === -1 && pageIndex === 0) {
        setDirection("back");
        setShowCover(true);
        return;
      }
      if (delta === 1 && canGoForward) turnPage("forward");
      if (delta === -1 && canGoBack) turnPage("back");
    },
    [canGoBack, canGoForward, openBook, pageIndex, showCover, turnPage],
  );

  const openIllustration = () => setIllustrationOpen(true);

  const leftContent =
    isEndSpread || isEndPage ? (
      <EndPageFace book={book} side="left" singlePage={singlePage} compactChrome={compactChrome} />
    ) : leftPage ? (
      <StoryPageFace
        book={book}
        page={leftPage}
        pageIndex={leftStoryIndex}
        side="left"
        singlePage={singlePage}
        compactChrome={compactChrome}
        onOpenIllustration={openIllustration}
      />
    ) : (
      <ChildrenBookOrnamentPage
        page={book.pages[book.pages.length - 1]!}
        side="left"
        singlePage={singlePage}
        compactChrome={compactChrome}
      />
    );

  const rightContent =
    isEndSpread ? (
      <ChildrenBookOrnamentPage
        page={book.pages[book.pages.length - 1]!}
        side="right"
        singlePage={singlePage}
        compactChrome={compactChrome}
      />
    ) : isEndPage ? (
      <ChildrenBookOrnamentPage
        page={book.pages[book.pages.length - 1]!}
        side="right"
        singlePage={singlePage}
        compactChrome={compactChrome}
      />
    ) : singlePage ? null : rightPage ? (
      <StoryPageFace
        book={book}
        page={rightPage}
        pageIndex={rightStoryIndex!}
        side="right"
        singlePage={singlePage}
        compactChrome={compactChrome}
        onOpenIllustration={openIllustration}
      />
    ) : (
      <ChildrenBookOrnamentPage
        page={book.pages[book.pages.length - 1]!}
        side="right"
        singlePage={singlePage}
        compactChrome={compactChrome}
      />
    );

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

      {illustrationPage && !showCover && (
        <>
          <button
            type="button"
            onClick={openIllustration}
            aria-label="Illustration tools for this page"
            className={cn(
              "absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full",
              "text-leather/50 opacity-0 transition hover:bg-white/60 hover:text-leather",
              "group-hover/reader:opacity-100 focus-visible:opacity-100",
            )}
          >
            <ImageIcon className="h-4 w-4" aria-hidden />
          </button>

          <PageIllustrationSheet
            open={illustrationOpen}
            onOpenChange={setIllustrationOpen}
            book={book}
            page={illustrationPage}
            pageNumber={illustrationPageNumber}
          />
        </>
      )}

      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {showCover ? (
          <ChildrenBookCoverSpread book={book} opening={openingCover} onOpen={openBook} />
        ) : (
          <BookScene
            progress={progress}
            leftPage={
              <SwipePage side="left" onTurn={handleSwipeTurn}>
                <PageFlip
                  pageKey={`${book.slug}-${pageIndex}-left`}
                  direction={direction}
                  side="left"
                  enableSlide={!effectiveSpread}
                  instant={effectiveSpread}
                >
                  {leftContent}
                </PageFlip>
              </SwipePage>
            }
            rightPage={
              rightContent ? (
                <SwipePage side="right" onTurn={handleSwipeTurn}>
                  <PageFlip
                    pageKey={`${book.slug}-${pageIndex}-right`}
                    direction={direction}
                    side="right"
                    enableSlide={false}
                    instant={effectiveSpread}
                  >
                    {rightContent}
                  </PageFlip>
                </SwipePage>
              ) : null
            }
            singlePage={!effectiveSpread}
            tabletPortrait={tabletPortrait}
            fillContainer
            fabricSurround={showHubShell}
            hubInline={showHubShell}
            coverStyle={
              {
                "--lc-base": "28 35% 20%",
                "--lc-dark": "24 45% 13%",
                "--lc-light": "34 38% 33%",
                "--lc-highlight": "42 62% 58%",
                "--lc-border": "25 28% 9%",
              } as CSSProperties
            }
            coverClassName="leather-cover--foil-gold"
            pageClassName="reader-page-cream"
          />
        )}

        {!showCover && (
          <>
            <button
              type="button"
              onClick={() => turnPage("back")}
              disabled={showCover}
              aria-label={pageIndex === 0 ? "Back to cover" : "Previous page"}
              className={cn(
                "absolute inset-y-0 left-0 z-20 flex w-[min(18%,5rem)] items-center justify-start pl-2",
                "text-leather/40 opacity-0 transition disabled:pointer-events-none",
                "hover:text-leather/70 group-hover/reader:opacity-100 focus-visible:opacity-100",
                pageIndex === 0 && "opacity-0 group-hover/reader:opacity-100 focus-visible:opacity-100",
                !canGoBack && pageIndex > 0 && "opacity-0",
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
          </>
        )}
      </main>
    </div>
  );
}
