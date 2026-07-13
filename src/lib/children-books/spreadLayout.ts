import type { ChildrenBookPageLayout } from "@/lib/children-books/storybook";

/** Where narrative copy sits relative to the illustration on a physical page. */
export type PictureBookTextPosition = "top" | "bottom" | "pocket";

/**
 * Classic picture-book rhythm:
 * - left page: text above art
 * - right page: art above text
 * Creates a diagonal zig-zag across the spread.
 */
export function resolvePictureBookTextPosition(
  layout: ChildrenBookPageLayout,
  side: "left" | "right",
): PictureBookTextPosition {
  switch (layout) {
    case "text-pocket":
      return "pocket";
    case "text-only":
      return "top";
    case "full-spread":
      return side === "left" ? "bottom" : "top";
    default:
      return side === "left" ? "top" : "bottom";
  }
}

export function isTextOnlyLayout(layout: ChildrenBookPageLayout): boolean {
  return layout === "text-only";
}
