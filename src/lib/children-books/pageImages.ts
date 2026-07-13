import type { ChildrenBook, ChildrenBookPage } from "@/lib/children-books/storybook";

export const CHILDREN_BOOK_IMAGE_EVENT = "yb-children-book-image";

export type ChildrenBookImageEventDetail =
  | { bookSlug: string; pageNumber: number; kind?: "page" }
  | { bookSlug: string; kind: "cover" };

export function pageImageStorageKey(bookSlug: string, pageNumber: number): string {
  return `yb_children_book_img:${bookSlug}:${pageNumber}`;
}

export function coverImageStorageKey(bookSlug: string): string {
  return `yb_children_book_cover:${bookSlug}`;
}

export function getStoredPageImageUrl(bookSlug: string, pageNumber: number): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(pageImageStorageKey(bookSlug, pageNumber));
}

export function getStoredCoverImageUrl(bookSlug: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(coverImageStorageKey(bookSlug));
}

export function setStoredPageImageUrl(bookSlug: string, pageNumber: number, url: string | null): void {
  if (typeof window === "undefined") return;
  const key = pageImageStorageKey(bookSlug, pageNumber);
  const trimmed = url?.trim();
  if (trimmed) localStorage.setItem(key, trimmed);
  else localStorage.removeItem(key);
  window.dispatchEvent(
    new CustomEvent(CHILDREN_BOOK_IMAGE_EVENT, {
      detail: { bookSlug, pageNumber, kind: "page" } satisfies ChildrenBookImageEventDetail,
    }),
  );
}

export function setStoredCoverImageUrl(bookSlug: string, url: string | null): void {
  if (typeof window === "undefined") return;
  const key = coverImageStorageKey(bookSlug);
  const trimmed = url?.trim();
  if (trimmed) localStorage.setItem(key, trimmed);
  else localStorage.removeItem(key);
  window.dispatchEvent(
    new CustomEvent(CHILDREN_BOOK_IMAGE_EVENT, {
      detail: { bookSlug, kind: "cover" } satisfies ChildrenBookImageEventDetail,
    }),
  );
}

/** Built-in asset path when files live under public/children-books/{slug}/01.png */
export function defaultPageImagePath(bookSlug: string, pageNumber: number): string {
  return `/children-books/${bookSlug}/${String(pageNumber).padStart(2, "0")}.png`;
}

/** Built-in cover asset path under public/children-books/{slug}/cover.png */
export function defaultCoverImagePath(bookSlug: string): string {
  return `/children-books/${bookSlug}/cover.png`;
}

/** Built-in closing-spread illustration under public/children-books/{slug}/end.png */
export function defaultClosingImagePath(bookSlug: string): string {
  return `/children-books/${bookSlug}/end.png`;
}

const preloadCache = new Set<string>();

/** Warm the browser cache for static book assets (deduped per session). */
export function preloadImageUrl(url: string, priority: "high" | "low" = "low"): void {
  if (typeof window === "undefined" || !url || preloadCache.has(url)) return;
  preloadCache.add(url);
  const img = new Image();
  if (priority === "high" && "fetchPriority" in img) {
    (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "high";
  }
  img.decoding = "async";
  img.src = url;
}

export function preloadImageUrls(urls: string[], priority: "high" | "low" = "low"): void {
  for (const url of urls) {
    preloadImageUrl(url, priority);
  }
}

export function resolveClosingImageUrl(book: ChildrenBook): string | undefined {
  const fromBook = book.closingImageUrl?.trim();
  if (fromBook) return fromBook;

  const stored = getStoredClosingImageUrl(book.slug);
  if (stored) return stored;

  if (book.useDefaultClosingImagePath) {
    return defaultClosingImagePath(book.slug);
  }

  return undefined;
}

export function closingImageStorageKey(bookSlug: string): string {
  return `yb_children_book_end:${bookSlug}`;
}

export function getStoredClosingImageUrl(bookSlug: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(closingImageStorageKey(bookSlug));
}

export function setStoredClosingImageUrl(bookSlug: string, url: string | null): void {
  if (typeof window === "undefined") return;
  const key = closingImageStorageKey(bookSlug);
  const trimmed = url?.trim();
  if (trimmed) localStorage.setItem(key, trimmed);
  else localStorage.removeItem(key);
}

/** All static illustration URLs for a book (cover, pages, closing). */
export function listBookAssetUrls(book: ChildrenBook): string[] {
  const urls: string[] = [];
  const cover = resolveCoverImageUrl(book);
  if (cover) urls.push(cover);
  const closing = resolveClosingImageUrl(book);
  if (closing) urls.push(closing);
  book.pages.forEach((page, index) => {
    const url = resolvePageImageUrl(book, page, index + 1);
    if (url) urls.push(url);
  });
  return [...new Set(urls)];
}

export function resolvePageImageUrl(
  book: ChildrenBook,
  page: ChildrenBookPage,
  pageNumber: number,
): string | undefined {
  const fromPage = page.imageUrl?.trim();
  if (fromPage) return fromPage;

  const stored = getStoredPageImageUrl(book.slug, pageNumber);
  if (stored) return stored;

  if (page.useDefaultImagePath || book.useDefaultImagePaths) {
    return defaultPageImagePath(book.slug, pageNumber);
  }

  return undefined;
}

export function resolveCoverImageUrl(book: ChildrenBook): string | undefined {
  const fromBook = book.coverImageUrl?.trim();
  if (fromBook) return fromBook;

  const stored = getStoredCoverImageUrl(book.slug);
  if (stored) return stored;

  if (book.useDefaultCoverPath) {
    return defaultCoverImagePath(book.slug);
  }

  return undefined;
}
