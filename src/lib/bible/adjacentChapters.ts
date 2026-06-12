import { findBookByAbbr, getBooks, readCanon } from "@/lib/bible/canon";

export type ChapterRef = { book: string; chapter: number };

export function adjacentChapterRefs(bookAbbr: string, chapter: number): ChapterRef[] {
  const books = getBooks(readCanon());
  const book = findBookByAbbr(bookAbbr);
  if (!book) return [];

  const refs: ChapterRef[] = [];
  const bookIndex = books.findIndex((b) => b.abbr === book.abbr);

  if (chapter > 1) {
    refs.push({ book: book.abbr, chapter: chapter - 1 });
  } else if (bookIndex > 0) {
    const prev = books[bookIndex - 1]!;
    refs.push({ book: prev.abbr, chapter: prev.chapters });
  }

  if (chapter < book.chapters) {
    refs.push({ book: book.abbr, chapter: chapter + 1 });
  } else if (bookIndex >= 0 && bookIndex < books.length - 1) {
    const next = books[bookIndex + 1]!;
    refs.push({ book: next.abbr, chapter: 1 });
  }

  return refs;
}
