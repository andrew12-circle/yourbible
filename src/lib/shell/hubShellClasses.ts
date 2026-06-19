import { cn } from "@/lib/utils";
import { MOBILE_MIN_HEIGHT } from "@/lib/shell/mobileShellClasses";

/** Root wrapper for a page rendered inside the hub content card. */
export function hubShellPageRoot(showHubShell: boolean, mobileClassName: string, hubClassName?: string) {
  return cn(
    showHubShell
      ? hubClassName ?? "flex h-full min-h-0 flex-col overflow-hidden bg-background"
      : mobileClassName,
  );
}

/** Scrollable main region when nested in the hub card. */
export function hubShellScrollMain(showHubShell: boolean, className?: string) {
  return cn(showHubShell && "flex-1 min-h-0 overflow-y-auto overflow-x-hidden", className);
}

/** Full-height page root: fill hub content card, mini-phone pane, or mobile viewport. */
export function hubShellPageHeight(showHubShell: boolean, inMiniPhone = false) {
  if (showHubShell || inMiniPhone) return "relative h-full min-h-0";
  return "h-[100dvh]";
}

/** Top padding for journal compose headers — avoid double safe-area inside hub / mini-phone panes. */
export function journalEntryHeaderPad(showHubShell: boolean, inMiniPhone = false): string {
  if (showHubShell || inMiniPhone) return "pt-2";
  return "pt-[calc(var(--safe-area-inset-top)+0.5rem)]";
}

/** Journal compose: flex column that shrinks naturally when iOS resizes the viewport for the keyboard. */
export function journalEntryPageRoot(showHubShell: boolean, inMiniPhone = false) {
  return cn(
    "flex min-h-0 flex-col overflow-hidden bg-background",
    hubShellPageHeight(showHubShell, inMiniPhone),
  );
}

/** Default mobile min-height for pages using `hubShellPageRoot`. */
export { MOBILE_MIN_HEIGHT };

/** Bottom dock: fixed to viewport on mobile; anchored to page pane in hub shell / mini-phone. */
export function hubShellBottomDock(showHubShell: boolean, className?: string, inMiniPhone = false) {
  return cn(
    "pointer-events-none inset-x-0 bottom-0 shrink-0",
    showHubShell || inMiniPhone ? "absolute" : "fixed",
    className,
  );
}
