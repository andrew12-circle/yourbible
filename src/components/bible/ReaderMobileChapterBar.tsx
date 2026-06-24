import { useLayoutEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const READER_MOBILE_CHAPTER_BAR_H = 40;

type Props = {
  bookName: string;
  chapter: number;
  scrollMode: boolean;
  globalPage?: number;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onOpenSettings: () => void;
  className?: string;
};

/** Fixed chapter / page controls above the mobile reader dock. */
export function ReaderMobileChapterBar({
  bookName,
  chapter,
  scrollMode,
  globalPage,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onOpenSettings,
  className,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const bar = rootRef.current;
    if (!bar) return;
    const readerRoot = bar.closest("[data-bible-reader]") as HTMLElement | null;
    if (!readerRoot) return;

    const sync = () => {
      const h = Math.ceil(bar.getBoundingClientRect().height);
      readerRoot.style.setProperty("--reader-mobile-chapter-bar-h", `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(bar);
    return () => {
      ro.disconnect();
      readerRoot.style.removeProperty("--reader-mobile-chapter-bar-h");
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-reader-chapter-bar
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[25] flex justify-center px-3",
        "bottom-[calc(var(--reader-mobile-dock-h,6rem)+env(safe-area-inset-bottom,0px))]",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex h-10 w-full max-w-md items-center justify-between gap-2",
          "rounded-full border border-border/40 bg-paper/95 px-2 shadow-md backdrop-blur-md",
          "text-[10px] font-display tracking-widest text-muted-foreground/70",
        )}
      >
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label={scrollMode ? "Previous chapter" : "Previous page"}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
            canGoBack
              ? "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              : "text-muted-foreground/25",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="min-w-0 flex-1 truncate text-center hover:text-muted-foreground"
          aria-label={`${bookName} ${chapter} — open reader settings`}
        >
          <span className="font-medium">{bookName}</span>
          <span aria-hidden> · </span>
          <span>{chapter}</span>
          {!scrollMode && globalPage != null ? (
            <>
              <span aria-hidden> · </span>
              <span>p. {globalPage}</span>
            </>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onForward}
          disabled={!canGoForward}
          aria-label={scrollMode ? "Next chapter" : "Next page"}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
            canGoForward
              ? "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              : "text-muted-foreground/25",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
