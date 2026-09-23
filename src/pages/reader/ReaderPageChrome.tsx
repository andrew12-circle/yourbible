import type { CSSProperties, Ref } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageHorizontalPadding } from "@/lib/bible/readerPageMargins";

type HeaderProps = {
  side: "left" | "right";
  scrollMode: boolean;
  compactChrome: boolean;
  effectiveSpread: boolean;
  globalPage: number;
  /** Actual chapter range on this physical page, never the route alone. */
  pageReference: string | null;
  onOpenSettings: () => void;
};

export function ReaderPageHeader({
  side,
  scrollMode,
  compactChrome,
  effectiveSpread,
  globalPage,
  pageReference,
  onOpenSettings,
}: HeaderProps) {
  const padding = pageHorizontalPadding(side, !effectiveSpread, compactChrome);
  const left = String(padding.paddingLeft);
  const right = String(padding.paddingRight);
  const labelOnRight = effectiveSpread && side === "right";
  const showNumber = !scrollMode && pageReference != null && Number.isSafeInteger(globalPage) && globalPage > 0;
  return (
    <div
      data-reader-running-head
      className="relative h-5 min-w-0 shrink-0 text-[10px] font-display leading-5 text-muted-foreground/70"
      // The text margins are asymmetric near the spine. Bleed only the header
      // back to the physical page edges so its number is truly centered.
      style={{
        width: `calc(100% + ${left} + ${right})`,
        marginLeft: `calc(-1 * ${left})`,
        marginRight: `calc(-1 * ${right})`,
      }}
    >
      {pageReference != null ? (
        <button
          type="button"
          data-reader-running-reference
          onClick={onOpenSettings}
          className="absolute top-0 truncate text-[10px] font-medium uppercase tracking-[0.12em] transition-colors hover:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            ...(labelOnRight ? { right, textAlign: "right" as const } : { left, textAlign: "left" as const }),
            maxWidth: `calc(50% - ${labelOnRight ? right : left} - 1.25rem)`,
          }}
          aria-label={`${pageReference} — open reader settings`}
        >
          {pageReference}
        </button>
      ) : null}
      {showNumber ? (
        <span
          data-reader-running-page-number
          className="reader-page-number pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 tabular-nums"
          aria-label={`Page ${globalPage}`}
        >
          {globalPage}
        </span>
      ) : null}
    </div>
  );
}

type PlaceholderProps = {
  pageLoading: boolean;
  showMeasureArticle: boolean;
  measureRef?: Ref<HTMLElement>;
  scriptureTypoClass: string;
  articleStyle: CSSProperties;
};

/** Loading spinner or (out-of-range) hidden measuring article for a reader page. */
export function ReaderPageBodyPlaceholder({
  pageLoading,
  showMeasureArticle,
  measureRef,
  scriptureTypoClass,
  articleStyle,
}: PlaceholderProps) {
  if (showMeasureArticle && measureRef) {
    return (
      <div className="relative flex flex-1 min-h-0 min-w-0" aria-hidden>
        <article
          ref={measureRef}
          data-reading-area
          className={cn("absolute inset-0 h-full w-full overflow-hidden", scriptureTypoClass)}
          style={articleStyle}
        />
        {pageLoading ? (
          <div className="absolute inset-0 z-[1] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-leather/60" />
          </div>
        ) : null}
      </div>
    );
  }
  if (pageLoading) {
    return (
      <div className="flex flex-1 justify-center items-center">
        <Loader2 className="w-6 h-6 animate-spin text-leather/60" />
      </div>
    );
  }
  return <div className="flex flex-1 min-h-0" aria-hidden />;
}

type FooterProps = {
  inkMode: boolean;
  side: "left" | "right";
  effectiveSpread: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
};

/** Preserve the measured footer band; remove its visual chrome, not its tap target. */
export function ReaderPageFooter({
  inkMode,
  side,
  effectiveSpread,
  canGoBack,
  canGoForward,
  onPrevPage,
  onNextPage,
}: FooterProps) {
  const previous = side === "left";
  const buttonClass = "flex h-full min-w-11 items-center justify-center rounded-sm bg-transparent text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] disabled:pointer-events-none disabled:opacity-25";
  return (
    <div
      data-page-footer
      data-reader-footer-mode={effectiveSpread ? "tap-area" : "corner-arrows"}
      className={cn(
        "relative z-[8] flex h-10 shrink-0 items-center justify-between",
        inkMode && "pointer-events-none",
      )}
    >
      {effectiveSpread ? (
        <button
          type="button"
          aria-label={previous ? "Previous page" : "Next page"}
          disabled={inkMode || !(previous ? canGoBack : canGoForward)}
          onClick={previous ? onPrevPage : onNextPage}
          className={cn(buttonClass, "w-full")}
        />
      ) : (
        <>
          <button type="button" onClick={onPrevPage} disabled={inkMode || !canGoBack} aria-label="Previous page" className={buttonClass}>
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onNextPage} disabled={inkMode || !canGoForward} aria-label="Next page" className={buttonClass}>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
