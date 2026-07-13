import type { ChildrenBookPage } from "@/lib/children-books/storybook";

/** One open spread shows two story pages (left + right). */
export function childrenBookSpreadCount(pages: ChildrenBookPage[]): number {
  return Math.ceil(pages.length / 2);
}

export function leftStoryPageIndex(spreadIndex: number): number {
  return spreadIndex * 2;
}

export function rightStoryPageIndex(spreadIndex: number, pageCount: number): number | null {
  const index = spreadIndex * 2 + 1;
  return index < pageCount ? index : null;
}

export function storyPageNumber(pageIndex: number): number {
  return pageIndex + 1;
}
