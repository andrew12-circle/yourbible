import type { CSSProperties } from "react";

/** Outer edge of each page on single-page / mobile layouts. */
export const PAGE_MARGIN_OUTER = "clamp(1.125rem, 4vmin, 2.25rem)";
/** Inner edge toward the spine on single-page layouts. */
export const PAGE_MARGIN_GUTTER = "clamp(2.25rem, 8vmin, 4.5rem)";

/** Outer edge on desktop open-book spreads (away from the leather cover). */
export const SPREAD_PAGE_MARGIN_OUTER = "clamp(1.5rem, 5vmin, 2.75rem)";
/** Spine gutter on desktop spreads (between facing pages and column 2 / column 3). */
export const SPREAD_PAGE_MARGIN_GUTTER = "clamp(3rem, 10vmin, 5.5rem)";

const SPREAD_TOTAL_STACK_PX = 44;
const SPREAD_MIN_STACK_PX = 20;

/** Matches BookScene page-stack fore-edge width (progress → thicker left or right block). */
export function spreadPageStackWidths(progress: number): { left: number; right: number } {
  const left = Math.max(SPREAD_MIN_STACK_PX, Math.round(SPREAD_TOTAL_STACK_PX * progress));
  const right = Math.max(SPREAD_MIN_STACK_PX, Math.round(SPREAD_TOTAL_STACK_PX * (1 - progress)));
  return { left, right };
}

/** Average fore-edge stack so overlay text blocks look centered on the spread. */
export function spreadOverlayForeEdgeStackPx(leftStackPx: number, rightStackPx: number): number {
  return Math.round((Math.max(0, leftStackPx) + Math.max(0, rightStackPx)) / 2);
}

/** Comfortable horizontal inset on phones / compact reader chrome. */
export const MOBILE_PAGE_MARGIN_H = "clamp(1rem, 4.5vw, 1.375rem)";

export function pageHorizontalPadding(
  side: "left" | "right",
  singlePage?: boolean,
  compactSinglePage?: boolean,
): CSSProperties {
  if (singlePage && compactSinglePage) {
    return {
      paddingLeft: MOBILE_PAGE_MARGIN_H,
      paddingRight: MOBILE_PAGE_MARGIN_H,
    };
  }
  const outer = singlePage ? PAGE_MARGIN_OUTER : SPREAD_PAGE_MARGIN_OUTER;
  const gutter = singlePage ? PAGE_MARGIN_GUTTER : SPREAD_PAGE_MARGIN_GUTTER;
  if (singlePage) {
    return { paddingLeft: outer, paddingRight: gutter };
  }
  return side === "left"
    ? { paddingLeft: outer, paddingRight: gutter }
    : { paddingLeft: gutter, paddingRight: outer };
}

/**
 * Spread scripture overlay sits over the full paper width; add stack inset on the
 * outer fore-edge so text aligns with the inset page surfaces below.
 */
export function spreadOverlayPanePadding(
  side: "left" | "right",
  pageStackPx: number,
): CSSProperties {
  const outer = SPREAD_PAGE_MARGIN_OUTER;
  const gutter = SPREAD_PAGE_MARGIN_GUTTER;
  const stack = Math.max(0, Math.round(pageStackPx));
  return side === "left"
    ? {
        paddingLeft: `calc(${outer} + ${stack}px)`,
        paddingRight: gutter,
      }
    : {
        paddingLeft: gutter,
        paddingRight: `calc(${outer} + ${stack}px)`,
      };
}
