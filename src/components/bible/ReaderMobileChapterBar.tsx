import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  /** The app dock is mounted below the reader controls. */
  dockVisible: boolean;
  /** Use local positioning when the reader lives inside the hub card. */
  position: "absolute" | "fixed";
  className?: string;
};

/** Compact chapter / page controls over the lower edge of the mobile reader. */
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
  dockVisible,
  position,
  className,
}: Props) {
  return (
    <div
      data-reader-chapter-bar
      className={cn(
        "pointer-events-none inset-x-0 z-[25] flex justify-center px-3",
        position,
        dockVisible
          ? "bottom-[calc(var(--reader-mobile-dock-h,5.5rem)+max(0.75rem,env(safe-area-inset-bottom,0px)))]"
          : "bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex h-11 w-fit max-w-[min(20rem,calc(100vw-1.5rem))] items-center gap-1",
          "rounded-full border border-border/40 bg-paper/95 px-1 shadow-lg backdrop-blur-md",
          "text-[10px] font-display tracking-widest text-muted-foreground/70",
        )}
      >
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label={scrollMode ? "Previous chapter" : "Previous page"}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
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
          className="min-w-0 max-w-[13rem] truncate px-1.5 text-center hover:text-muted-foreground"
          aria-label={`${bookName} ${chapter} — open reader settings`}
        >
          <span className="font-medium">{bookName}</span>
          <span aria-hidden> · </span>
          <span>{chapter}</span>
          {!scrollMode && globalPage != null ? (
            <>
              <span aria-hidden> · </span>
              <span className="reader-page-number">p. {globalPage}</span>
            </>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onForward}
          disabled={!canGoForward}
          aria-label={scrollMode ? "Next chapter" : "Next page"}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
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
