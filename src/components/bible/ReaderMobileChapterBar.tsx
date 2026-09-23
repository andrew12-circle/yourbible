import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  scrollMode: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  /** Disable page turns while drawing; keep the controls out of the ink layer. */
  disabled?: boolean;
  dockVisible: boolean;
  position: "absolute" | "fixed";
  className?: string;
};

/** Single-page controls: small corner arrows, generous tap areas, no center pill. */
export function ReaderMobileChapterBar({
  scrollMode,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  disabled = false,
  dockVisible,
  position,
  className,
}: Props) {
  const buttonClass = "pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-transparent text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] disabled:pointer-events-none disabled:opacity-25";
  return (
    <div
      data-reader-chapter-bar
      data-reader-footer-mode="corner-arrows"
      className={cn(
        "pointer-events-none inset-x-0 z-[25] flex justify-between px-3",
        position,
        dockVisible
          ? "bottom-[calc(var(--reader-mobile-dock-h,5.5rem)+max(0.75rem,env(safe-area-inset-bottom,0px)))]"
          : "bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
        className,
      )}
    >
      <button type="button" onClick={onBack} disabled={disabled || !canGoBack} aria-label={scrollMode ? "Previous chapter" : "Previous page"} className={buttonClass}>
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button type="button" onClick={onForward} disabled={disabled || !canGoForward} aria-label={scrollMode ? "Next chapter" : "Next page"} className={buttonClass}>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
