import { BOOKS, type BibleBook } from "@/data/books";

/** Total chapters in the Protestant canon (pagination proxy). */
export const CANON_CHAPTER_COUNT = BOOKS.reduce((s, b) => s + b.chapters, 0);

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
}

export function chaptersBeforeBook(bookAbbr: string): number {
  let before = 0;
  for (const b of BOOKS) {
    if (b.abbr === bookAbbr) return before;
    before += b.chapters;
  }
  return before;
}

/** Start page for a book (printed-style, consistent across the reader). */
export function bookStartPageNumber(bookAbbr: string): number {
  return Math.max(1, Math.round(chaptersBeforeBook(bookAbbr) * PRINT_PAGE_SCALE) + 1);
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
  { id: "preface", label: "PREFACE", page: "VII", pageStyle: "roman", clickable: false },
  {
    id: "features",
    label: "EXPLANATION OF FEATURES",
    page: "XII",
    pageStyle: "roman",
    clickable: false,
  },
];

export const CONTENTS_BACK_MATTER: ContentsRow[] = [
  {
    id: "weights",
    label: "TABLE OF WEIGHTS AND MEASURES",
    page: 1574,
    clickable: false,
  },
  { id: "abbrev", label: "ABBREVIATIONS", page: 1575, clickable: false },
  { id: "concordance", label: "CONCORDANCE", page: 1577, clickable: false },
  { id: "maps", label: "MAPS AND CHART", page: "", clickable: false },
];

export function oldTestamentBooks(): BibleBook[] {
  return BOOKS.filter((b) => b.testament === "OT");
}

export function newTestamentBooks(): BibleBook[] {
  return BOOKS.filter((b) => b.testament === "NT");
}
