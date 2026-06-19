import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Prefer over `min-h-screen` on full-viewport mobile pages. */
export const MOBILE_MIN_HEIGHT = "min-h-[100dvh]" as const;

/** Fixed full viewport column (chat / reader-style layouts). */
export const MOBILE_FILL_HEIGHT = "h-[100dvh]" as const;

export function mobileSafeHeaderPad(showHubShell: boolean, extraRem = 0.5): string | false {
  if (showHubShell) return false;
  return `pt-[calc(var(--safe-area-inset-top)+${extraRem}rem)]`;
}

/** Top padding for chrome inside a full-screen mobile sheet (status bar / Dynamic Island). */
export function mobileSheetSafeTop(extraRem = 0.5): string {
  return `pt-[calc(var(--safe-area-inset-top)+${extraRem}rem)]`;
}

export function mobilePageRoot(
  showHubShell: boolean,
  options?: {
    fill?: boolean;
    className?: string;
    hubClassName?: string;
  },
) {
  const mobile = options?.fill
    ? cn(MOBILE_FILL_HEIGHT, "flex min-h-0 flex-col overflow-hidden bg-background", options.className)
    : cn(MOBILE_MIN_HEIGHT, "bg-background", options.className);

  return cn(
    showHubShell
      ? (options?.hubClassName ?? "flex h-full min-h-0 flex-col overflow-hidden bg-background")
      : mobile,
  );
}

export function mobileStickyHeaderClass(
  showHubShell: boolean,
  extraRem = 0.5,
  className?: string,
) {
  return cn(
    "sticky top-0 z-20 shrink-0 border-b border-border/60 bg-background/90 backdrop-blur-md",
    mobileSafeHeaderPad(showHubShell, extraRem),
    className,
  );
}

export function mobileScrollMainClass(showHubShell: boolean, className?: string) {
  return cn(showHubShell && "flex-1 min-h-0 overflow-y-auto overflow-x-hidden", className);
}

/** Centered loading / error screens with safe-area insets. */
export function mobileCenteredScreen(className?: string) {
  return cn(MOBILE_MIN_HEIGHT, "flex items-center justify-center px-6 pt-safe pb-safe", className);
}

export function mobileBottomDockTransform(keyboardInset: number): CSSProperties {
  return {
    transform: keyboardInset ? `translateY(-${keyboardInset}px)` : undefined,
    transition: "transform 120ms ease-out",
  };
}

/** Pin a full-screen mobile page to the visible viewport while the keyboard is open (iOS Safari). */
export function mobileVisualViewportPageStyle(opts: {
  keyboardInset: number;
  offsetTop: number;
  viewportHeight: number;
  enabled?: boolean;
}): CSSProperties | undefined {
  if (opts.enabled === false || opts.keyboardInset <= 0) return undefined;
  return {
    height: opts.viewportHeight,
    maxHeight: opts.viewportHeight,
    transform: opts.offsetTop > 0 ? `translateY(${opts.offsetTop}px)` : undefined,
    transition: "transform 120ms ease-out, height 120ms ease-out",
  };
}

export function mobileBottomDockPadding(extra = "0.75rem"): CSSProperties {
  return { paddingBottom: `max(env(safe-area-inset-bottom), ${extra})` };
}
