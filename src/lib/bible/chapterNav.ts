import { BOOKS, type BibleBook } from "@/data/books";

export interface ChapterRef {
  book: BibleBook;
  chapter: number;
}

export function getBookIndex(abbr: string): number {
  return BOOKS.findIndex((b) => b.abbr.toLowerCase() === abbr.toLowerCase());
}

export function getPrevChapterRef(bookAbbr: string, chapter: number): ChapterRef | null {
  const idx = getBookIndex(bookAbbr);
  if (idx < 0) return null;
  const book = BOOKS[idx]!;
  if (chapter > 1) return { book, chapter: chapter - 1 };
  if (idx === 0) return null;
  const prev = BOOKS[idx - 1]!;
  return { book: prev, chapter: prev.chapters };
}

export function getNextChapterRef(bookAbbr: string, chapter: number): ChapterRef | null {
  const idx = getBookIndex(bookAbbr);
  if (idx < 0) return null;
  const book = BOOKS[idx]!;
  if (chapter < book.chapters) return { book, chapter: chapter + 1 };
  if (idx >= BOOKS.length - 1) return null;
  const next = BOOKS[idx + 1]!;
  return { book: next, chapter: 1 };
}
