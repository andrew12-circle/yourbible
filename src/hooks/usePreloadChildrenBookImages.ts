import { useEffect } from "react";
import {
  listBookAssetUrls,
  preloadImageUrl,
  preloadImageUrls,
  resolveCoverImageUrl,
  resolvePageImageUrl,
} from "@/lib/children-books/pageImages";
import { leftStoryPageIndex, rightStoryPageIndex } from "@/lib/children-books/spreadPagination";
import type { ChildrenBook } from "@/lib/children-books/storybook";

function spreadPageUrls(
  book: ChildrenBook,
  spreadIndex: number,
  singlePage: boolean,
): string[] {
  const urls: string[] = [];
  const leftIndex = singlePage ? spreadIndex : leftStoryPageIndex(spreadIndex);
  const rightIndex = singlePage ? null : rightStoryPageIndex(spreadIndex, book.pages.length);

  const leftPage = book.pages[leftIndex];
  if (leftPage) {
    const url = resolvePageImageUrl(book, leftPage, leftIndex + 1);
    if (url) urls.push(url);
  }

  if (rightIndex !== null) {
    const rightPage = book.pages[rightIndex];
    if (rightPage) {
      const url = resolvePageImageUrl(book, rightPage, rightIndex + 1);
      if (url) urls.push(url);
    }
  }

  return urls;
}

/** Preload cover + all assets when static files exist; prioritize nearby spreads while reading. */
export function usePreloadChildrenBookImages(
  book: ChildrenBook,
  options: {
    showCover: boolean;
    pageIndex: number;
    singlePage: boolean;
    spreadCount: number;
  },
) {
  const { showCover, pageIndex, singlePage, spreadCount } = options;

  useEffect(() => {
    if (!book.useDefaultImagePaths && !book.useDefaultCoverPath) return;
    preloadImageUrls(listBookAssetUrls(book), "low");
  }, [book]);

  useEffect(() => {
    if (showCover) {
      const cover = resolveCoverImageUrl(book);
      if (cover) preloadImageUrl(cover, "high");
      return;
    }

    const priorityUrls = [
      ...spreadPageUrls(book, pageIndex, singlePage),
      ...spreadPageUrls(book, pageIndex + 1, singlePage),
      ...spreadPageUrls(book, pageIndex - 1, singlePage),
    ];

    if (pageIndex >= spreadCount) {
      const closing = listBookAssetUrls(book).find((url) => url.includes("/end."));
      if (closing) priorityUrls.push(closing);
    }

    preloadImageUrls([...new Set(priorityUrls)], "high");
  }, [book, pageIndex, showCover, singlePage, spreadCount]);
}
