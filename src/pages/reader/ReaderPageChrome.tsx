import type { CSSProperties, Ref } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { readerEditionAbbreviation } from "@/lib/bible/readerEditionAttribution";
import type { BibleEntry } from "@/lib/bible/api";

type HeaderProps = {
  side: "left" | "right";
  scrollMode: boolean;
  compactChrome: boolean;
  effectiveSpread: boolean;
  globalPage: number;
  pageBookName: string;
  readerSourceLine: string | null;
  onOpenSettings: () => void;
};

export function ReaderPageHeader({
  side,
  scrollMode,
  compactChrome,
  effectiveSpread,
  globalPage,
  pageBookName,
  readerSourceLine,
  onOpenSettings,
}: HeaderProps) {
  const showRightNumber = side === "right" && !scrollMode && !compactChrome;
  const showLeftNumber = side === "left" && !scrollMode && !compactChrome;
  return (
    <>
      {showRightNumber ? (
        <span className="reader-page-number pt-0.5 shrink-0" aria-hidden>
          {globalPage}
        </span>
      ) : (
        <span className="w-0 shrink-0" aria-hidden />
      )}
      <div
        className={cn(
          "min-w-0 flex-1",
          !effectiveSpread || side === "left" ? "text-left" : "text-right",
        )}
      >
        <button
          type="button"
          onClick={onOpenSettings}
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-medium hover:text-muted-foreground transition-colors"
          aria-label={`${pageBookName} — open reader settings`}
        >
          {pageBookName}
        </button>
        {side === "left" && readerSourceLine ? (
          <p
            className="mt-0.5 max-w-[18rem] text-[9px] leading-snug text-muted-foreground/50 font-system"
            title={readerSourceLine}
          >
            {readerSourceLine}
          </p>
        ) : null}
      </div>
      {showLeftNumber ? (
        <span className="reader-page-number pt-0.5 shrink-0" aria-hidden>
          {globalPage}
        </span>
      ) : (
        <span className="w-0 shrink-0" aria-hidden />
      )}
    </>
  );
}

type PlaceholderProps = {
  pageLoading: boolean;
  showMeasureArticle: boolean;
  measureRestRef: Ref<HTMLElement>;
  scriptureTypoClass: string;
  articleStyle: CSSProperties;
};

/** Loading spinner or (out-of-range) hidden measuring article for a reader page. */
export function ReaderPageBodyPlaceholder({
  pageLoading,
  showMeasureArticle,
  measureRestRef,
  scriptureTypoClass,
  articleStyle,
}: PlaceholderProps) {
  if (pageLoading) {
    return (
      <div className="flex flex-1 justify-center items-center">
        <Loader2 className="w-6 h-6 animate-spin text-leather/60" />
      </div>
    );
  }
  if (showMeasureArticle) {
    return (
      <div className="flex flex-1 min-h-0 min-w-0" aria-hidden>
        <article
          ref={measureRestRef}
          data-reading-area
          className={cn("h-full min-h-0 w-full overflow-hidden", scriptureTypoClass)}
          style={articleStyle}
        />
      </div>
    );
  }
  return <div className="flex flex-1 min-h-0" aria-hidden />;
}

type FooterProps = {
  inkMode: boolean;
  pageBookName: string;
  globalPage: number;
  currentBible: BibleEntry | undefined;
  onOpenSettings: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function ReaderPageFooter({
  inkMode,
  pageBookName,
  globalPage,
  currentBible,
  onOpenSettings,
  onPrevPage,
  onNextPage,
}: FooterProps) {
  const editionAbbr = readerEditionAbbreviation(currentBible);
  return (
    <div
      data-page-footer
      className={cn(
        "flex-shrink-0 h-10 flex items-center justify-center gap-2 border-t border-border/25 text-[10px] text-muted-foreground/60 font-display tracking-widest",
        inkMode && "relative z-[21] pointer-events-none opacity-60",
      )}
    >
      <button
        onClick={onPrevPage}
        aria-label="Previous page"
        className="p-0.5 rounded-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="inline-flex items-center gap-1 flex-wrap justify-center">
        <button
          type="button"
          onClick={onOpenSettings}
          className="hover:text-muted-foreground transition-colors"
          aria-label={`${pageBookName} — open reader settings`}
        >
          {pageBookName}
        </button>
        {editionAbbr ? (
          <>
            <span aria-hidden>·</span>
            <span title={currentBible?.name}>{editionAbbr}</span>
          </>
        ) : null}
        <span aria-hidden className="reader-page-number">
          · p. {globalPage}
        </span>
      </span>
      <button
        onClick={onNextPage}
        aria-label="Next page"
        className="p-0.5 rounded-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
