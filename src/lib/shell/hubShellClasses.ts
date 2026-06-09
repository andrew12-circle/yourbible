import { cn } from "@/lib/utils";

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

/** Full-height page root: fill hub content card or use viewport height on mobile. */
export function hubShellPageHeight(showHubShell: boolean) {
  return showHubShell ? "relative h-full min-h-0" : "h-[100dvh]";
}

/** Bottom dock: fixed to viewport on mobile; anchored to page pane in hub shell. */
export function hubShellBottomDock(showHubShell: boolean, className?: string) {
  return cn(
    "pointer-events-none inset-x-0 bottom-0",
    showHubShell ? "absolute" : "fixed",
    className,
  );
}
