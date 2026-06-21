import type { Passage } from "@/lib/bible/api";
import type { Book } from "@/data/books";

export type WordStudyContext = {
  word: string;
  reference: string;
  bookAbbr: string;
  chapter: number;
  verses: number[];
  footnotes: string[];
};

type BuildArgs = {
  book: Book;
  chapter: number;
  verses: number[];
  passage: Passage | null | undefined;
};

export function buildWordStudyContext(
  word: string,
  { book, chapter, verses, passage }: BuildArgs,
): WordStudyContext {
  const refRange =
    verses.length > 1
      ? `${book.name} ${chapter}:${verses[0]}-${verses[verses.length - 1]}`
      : `${book.name} ${chapter}:${verses[0]}`;
  const footnotes = verses.flatMap((vn) => {
    const v = passage?.verses.find((x) => x.number === vn);
    return v?.footnotes?.map((f) => f.text) ?? [];
  });
  return {
    word,
    reference: refRange,
    bookAbbr: book.abbr,
    chapter,
    verses,
    footnotes,
  };
}

export function wordFromSelection(): string | null {
  const selText = typeof window !== "undefined" ? window.getSelection()?.toString().trim() : "";
  if (!selText) return null;
  return selText.split(/\s+/).find((w) => w.length >= 2) ?? (selText.slice(0, 40) || null);
}
