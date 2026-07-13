import type { CSSProperties } from "react";
import {
  MOBILE_PAGE_MARGIN_GUTTER,
  pageHorizontalPadding,
} from "@/lib/bible/readerPageMargins";

export type ChildrenBookPageFace = "text" | "art" | "ornament";

/** Tighter than Bible reader — picture books need room for art and large type. */
export const CHILDREN_SPREAD_OUTER = "clamp(0.75rem, 2.5vmin, 1.35rem)";
export const CHILDREN_SPREAD_GUTTER = "clamp(1.25rem, 4vmin, 2.25rem)";

/** Spread / cropped-spread padding — art bleeds to the fore-edge, text uses tighter gutters. */
export function childrenBookPagePadding(
  side: "left" | "right",
  face: ChildrenBookPageFace,
  singlePage: boolean,
  compactSinglePage?: boolean,
): CSSProperties {
  if (singlePage) {
    if (face === "art") {
      return side === "left"
        ? { paddingLeft: 0, paddingRight: MOBILE_PAGE_MARGIN_GUTTER }
        : { paddingLeft: MOBILE_PAGE_MARGIN_GUTTER, paddingRight: 0 };
    }
    return pageHorizontalPadding(side, true, compactSinglePage);
  }

  if (face === "art") {
    return side === "left"
      ? { paddingLeft: 0, paddingRight: CHILDREN_SPREAD_GUTTER }
      : { paddingLeft: CHILDREN_SPREAD_GUTTER, paddingRight: 0 };
  }

  return side === "left"
    ? { paddingLeft: CHILDREN_SPREAD_OUTER, paddingRight: CHILDREN_SPREAD_GUTTER }
    : { paddingLeft: CHILDREN_SPREAD_GUTTER, paddingRight: CHILDREN_SPREAD_OUTER };
}
