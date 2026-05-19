import type { BibleBook } from "@/data/books";

export type BookSortMode = "canonical" | "alphabetical";

export const LS_BOOK_SORT_KEY = "yb_book_picker_sort";

export function getStoredBookSortMode(): BookSortMode {
  if (typeof window === "undefined") return "canonical";
  const v = localStorage.getItem(LS_BOOK_SORT_KEY);
  return v === "alphabetical" ? "alphabetical" : "canonical";
}

export function storeBookSortMode(mode: BookSortMode): void {
  try {
    localStorage.setItem(LS_BOOK_SORT_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
}

export function sortBooksForDisplay(books: BibleBook[], mode: BookSortMode): BibleBook[] {
  if (mode === "canonical") return books;
  return [...books].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
