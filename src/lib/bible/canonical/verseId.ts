import { BOOKS, findBookByAbbr } from "@/data/books";

const VERSE_ID_RE = /^([^:]+):([^:]+):(\d+):(\d+)$/;

export function makeVerseId(
  bibleId: string,
  bookAbbr: string,
  chapter: number,
  verse: number,
): string {
  return `${bibleId}:${bookAbbr}:${chapter}:${verse}`;
}

export function parseVerseId(verseId: string): {
  bibleId: string;
  bookAbbr: string;
  chapter: number;
  verse: number;
} | null {
  const m = verseId.match(VERSE_ID_RE);
  if (!m) return null;
  return {
    bibleId: m[1]!,
    bookAbbr: m[2]!,
    chapter: Number(m[3]),
    verse: Number(m[4]),
  };
}

export function chapterCacheKey(bibleId: string, bookAbbr: string, chapter: number): string {
  return `${bibleId}|${bookAbbr}|${chapter}`;
}

export function bookOrderForAbbr(bookAbbr: string): number {
  const idx = BOOKS.findIndex((b) => b.abbr.toLowerCase() === bookAbbr.toLowerCase());
  return idx >= 0 ? idx : 0;
}

export function formatVerseReference(bookAbbr: string, chapter: number, verse: number): string {
  const book = findBookByAbbr(bookAbbr);
  const name = book?.name ?? bookAbbr;
  return `${name} ${chapter}:${verse}`;
}
