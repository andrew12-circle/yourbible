import type { BibleBook } from "@/data/books";
import { getBooks, readCanon } from "@/lib/bible/canon";

export interface ChapterRef {
  book: BibleBook;
  chapter: number;
}

export function getBookIndex(abbr: string, books = getBooks(readCanon())): number {
  return books.findIndex((b) => b.abbr.toLowerCase() === abbr.toLowerCase());
}

export function getPrevChapterRef(bookAbbr: string, chapter: number): ChapterRef | null {
  const books = getBooks(readCanon());
  const idx = getBookIndex(bookAbbr, books);
  if (idx < 0) return null;
  const book = books[idx]!;
  if (chapter > 1) return { book, chapter: chapter - 1 };
  if (idx === 0) return null;
  const prev = books[idx - 1]!;
  return { book: prev, chapter: prev.chapters };
}

export function getNextChapterRef(bookAbbr: string, chapter: number): ChapterRef | null {
  const books = getBooks(readCanon());
  const idx = getBookIndex(bookAbbr, books);
  if (idx < 0) return null;
  const book = books[idx]!;
  if (chapter < book.chapters) return { book, chapter: chapter + 1 };
  if (idx >= books.length - 1) return null;
  const next = books[idx + 1]!;
  return { book: next, chapter: 1 };
}
