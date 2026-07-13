import { useState } from "react";
import { ChildrenBookGoldFlourish } from "@/components/children-books/ChildrenBookGoldFlourish";
import { SpreadPageSpineShade } from "@/components/children-books/SpreadPageSpineShade";
import { usePageImageLoaded } from "@/hooks/usePageImageUrl";
import { childrenBookBodyClassName } from "@/lib/children-books/childrenBookTypography";
import { childrenBookPagePadding } from "@/lib/children-books/pageMargins";
import {
  resolveClosingImageUrl,
  resolveCoverImageUrl,
  resolvePageImageUrl,
} from "@/lib/children-books/pageImages";
import type { ChildrenBook } from "@/lib/children-books/storybook";
import { cn } from "@/lib/utils";

type EndPageSideProps = {
  book: ChildrenBook;
  side: "left" | "right";
  singlePage: boolean;
  compactChrome: boolean;
};

function resolveEndIllustrationFallback(book: ChildrenBook): string | undefined {
  const lastPage = book.pages[book.pages.length - 1];
  if (lastPage) {
    return resolvePageImageUrl(book, lastPage, book.pages.length);
  }
  return resolveCoverImageUrl(book);
}

export function ChildrenBookEndIllustrationPage({
  book,
  side,
  singlePage,
  compactChrome,
}: EndPageSideProps) {
  const primaryUrl = resolveClosingImageUrl(book);
  const fallbackUrl = resolveEndIllustrationFallback(book);
  const [imageUrl, setImageUrl] = useState(primaryUrl ?? fallbackUrl);
  const { loaded, onLoad, onError } = usePageImageLoaded(imageUrl);

  const handleError = () => {
    if (fallbackUrl && imageUrl !== fallbackUrl) {
      setImageUrl(fallbackUrl);
      return;
    }
    onError();
  };

  return (
    <article
      className="relative h-full min-h-0 overflow-hidden bg-paper"
      style={childrenBookPagePadding(side, "art", singlePage, compactChrome)}
    >
      <SpreadPageSpineShade side={side} spread={!singlePage} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: book.coverGradient, opacity: 0.35 }}
      />

      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
              loaded ? "opacity-100" : "opacity-0",
            )}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onLoad={onLoad}
            onError={handleError}
          />
          {!loaded && (
            <div
              className="absolute inset-0 animate-pulse bg-[linear-gradient(180deg,#faf6ee_0%,#f3ecdf_100%)]"
              aria-hidden
            />
          )}
        </>
      ) : (
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,#faf6ee_0%,#f3ecdf_100%)]"
          aria-hidden
        />
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/25 via-transparent to-amber-100/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 15%, rgba(255,255,255,0.55), transparent 35%), radial-gradient(circle at 80% 25%, rgba(255,215,130,0.35), transparent 30%)",
        }}
      />
    </article>
  );
}

export function ChildrenBookEndPrayerPage({
  book,
  side,
  singlePage,
  compactChrome,
}: EndPageSideProps) {
  return (
    <article
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#faf6ee_0%,#f3ecdf_100%)]"
      style={childrenBookPagePadding(side, "text", singlePage, compactChrome)}
    >
      <SpreadPageSpineShade side={side} spread={!singlePage} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 rounded-sm border border-amber-900/10 sm:inset-4"
        style={{
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.65), transparent 45%), radial-gradient(circle at 50% 90%, rgba(210,180,130,0.2), transparent 40%)",
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-8 text-center sm:px-4 sm:py-10">
        <p className="font-display text-[0.7rem] uppercase tracking-[0.28em] text-leather/55 sm:text-xs">
          A Lilly storybook
        </p>
        <h2 className="mt-3 font-display text-2xl text-leather sm:text-3xl">The end</h2>
        <ChildrenBookGoldFlourish className="mt-4" />
        <p className="mt-2 font-display text-sm text-leather/70 sm:text-base">Let&apos;s pray together</p>
        <p
          className={cn(
            "mt-5 max-w-md text-left font-serif italic text-foreground/88",
            childrenBookBodyClassName(book.closingPrayer),
          )}
        >
          {book.closingPrayer}
        </p>
        <ChildrenBookGoldFlourish className="mt-6" />
        <p className="mt-5 max-w-xs text-xs leading-relaxed text-muted-foreground sm:text-sm">{book.title}</p>
      </div>
    </article>
  );
}
