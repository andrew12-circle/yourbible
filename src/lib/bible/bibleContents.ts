import type { BibleBook } from "@/data/books";
import { getBooks, readCanon } from "@/lib/bible/canon";

function activeBooks(): BibleBook[] {
  return getBooks(readCanon());
}

/** Total chapters in the active canon (pagination proxy). */
export function canonChapterCount(): number {
  return activeBooks().reduce((s, b) => s + b.chapters, 0);
}

/** @deprecated Use canonChapterCount() — Protestant-only constant kept for tests. */
export const CANON_CHAPTER_COUNT = canonChapterCount();

/** Scale chapter index to a printed-Bible-style page (~CSB length). */
export const PRINT_PAGE_SCALE = 1577 / CANON_CHAPTER_COUNT;

export interface ContentsRow {
  id: string;
  label: string;
  page: number | string;
  bookAbbr?: string;
  chapter?: number;
  /** Roman numerals for front matter; default arabic. */
  pageStyle?: "roman" | "arabic";
  clickable?: boolean;
  /** Back/front matter route under /read/study/:id */
  studySection?: string;
}

export function chaptersBeforeBook(bookAbbr: string, books = activeBooks()): number {
  let before = 0;
  for (const b of books) {
    if (b.abbr === bookAbbr) return before;
    before += b.chapters;
  }
  return before;
}

/** Start page for a book (printed-style, consistent across the reader). */
export function bookStartPageNumber(bookAbbr: string): number {
  return Math.max(1, Math.round(chaptersBeforeBook(bookAbbr) * PRINT_PAGE_SCALE) + 1);
}

/** Printed-style page number for a chapter (per book, not route chapter). */
export function readerChapterPageNumber(bookAbbr: string, chapter: number): number {
  return Math.max(1, Math.round(chaptersBeforeBook(bookAbbr) * PRINT_PAGE_SCALE) + chapter);
}

export function bookToContentsRow(book: BibleBook): ContentsRow {
  return {
    id: book.abbr,
    label: book.name.toUpperCase(),
    page: bookStartPageNumber(book.abbr),
    bookAbbr: book.abbr,
    chapter: 1,
    clickable: true,
  };
}

export function splitBooksTwoColumns(books: BibleBook[]): [BibleBook[], BibleBook[]] {
  const mid = Math.ceil(books.length / 2);
  return [books.slice(0, mid), books.slice(mid)];
}

export const CONTENTS_FRONT_MATTER: ContentsRow[] = [
  {
    id: "preface",
    label: "PREFACE",
    page: "VII",
    pageStyle: "roman",
    clickable: true,
    studySection: "preface",
  },
  {
    id: "features",
    label: "EXPLANATION OF FEATURES",
    page: "XII",
    pageStyle: "roman",
    clickable: true,
    studySection: "features",
  },
];

export const CONTENTS_BACK_MATTER: ContentsRow[] = [
  {
    id: "weights",
    label: "TABLE OF WEIGHTS AND MEASURES",
    page: 1574,
    clickable: true,
    studySection: "weights",
  },
  {
    id: "abbrev",
    label: "ABBREVIATIONS",
    page: 1575,
    clickable: true,
    studySection: "abbrev",
  },
  {
    id: "concordance",
    label: "CONCORDANCE",
    page: 1577,
    clickable: true,
    studySection: "concordance",
  },
  {
    id: "artwork",
    label: "ARTWORK",
    page: 1578,
    clickable: true,
    studySection: "artwork",
  },
  {
    id: "maps",
    label: "MAPS AND CHART",
    page: 1579,
    clickable: true,
    studySection: "maps",
  },
];

export function oldTestamentBooks(books = activeBooks()): BibleBook[] {
  return books.filter((b) => b.testament === "OT");
}

export function newTestamentBooks(books = activeBooks()): BibleBook[] {
  return books.filter((b) => b.testament === "NT");
}

export function deuterocanonBooks(books = activeBooks()): BibleBook[] {
  return books.filter((b) => b.section === "deuterocanon");
}
