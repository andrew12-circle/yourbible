import { getBooks } from "@/lib/bible/canon";
import type { BibleBook } from "@/data/books";
import type { MorningScripture } from "@/hooks/useMorningScripture";

export type MorningChapter = { book: string; chapter: number; label: string };
const normalize = (value: string) => value.toLowerCase().replace(/[.\s]/g, "");

/** Resolve exact references, not the reader's forgiving search/guess fallback. */
export function morningReadingChapters(scripture: MorningScripture, books: BibleBook[] = getBooks()): MorningChapter[] {
  const findBook = (name: string) => books.find((book) =>
    normalize(book.abbr) === normalize(name) || normalize(book.name) === normalize(name) ||
    (["psalm", "ps"].includes(normalize(name)) && book.abbr === "Psa") ||
    (normalize(name) === "songofsongs" && book.name === "Song of Solomon"));
  const chapter = (name: string, number: number): MorningChapter => {
    const book = findBook(name);
    if (!book || !Number.isInteger(number) || number < 1 || number > book.chapters) throw new Error("This passage needs to be selected in the full Bible reader. No substitute passage has been loaded.");
    return { book: book.abbr, chapter: number, label: `${book.name} ${number}` };
  };
  if (scripture.source === "reading-plan" && scripture.planDay?.readings.length) {
    return scripture.planDay.readings.map((reading) => chapter(reading.book, reading.chapter));
  }
  // Chapter, chapter range, verses, or a range crossing chapter boundaries.
  const match = scripture.reference.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?(?:\s*[-–—]\s*(\d+)(?::(\d+))?)?$/);
  if (!match) throw new Error("Open this reference in the full Bible reader to choose its passage.");
  const [, book, first, verse, end, endVerse] = match;
  const from = Number(first);
  const to = end ? (!verse || endVerse ? Number(end) : from) : from;
  if ((verse && Number(verse) < 1) || (endVerse && Number(endVerse) < 1) || to < from || (verse && end && !endVerse && Number(end) < Number(verse))) throw new Error("This Scripture reference is not a valid range.");
  chapter(book, to);
  return Array.from({ length: to - from + 1 }, (_, i) => chapter(book, from + i));
}
