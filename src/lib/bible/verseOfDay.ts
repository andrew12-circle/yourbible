import { findBookByAbbr } from "@/data/books";

/** Curated verse-of-the-day references — cycles by calendar day. */
const VOTD_REFERENCES: { book: string; chapter: number; verse: number }[] = [
  { book: "Jhn", chapter: 3, verse: 16 },
  { book: "Psa", chapter: 23, verse: 1 },
  { book: "Rom", chapter: 8, verse: 28 },
  { book: "Php", chapter: 4, verse: 13 },
  { book: "Pro", chapter: 3, verse: 5 },
  { book: "Isa", chapter: 40, verse: 31 },
  { book: "Mat", chapter: 11, verse: 28 },
  { book: "Jos", chapter: 1, verse: 9 },
  { book: "Psa", chapter: 46, verse: 10 },
  { book: "Rom", chapter: 12, verse: 2 },
  { book: "1Co", chapter: 13, verse: 4 },
  { book: "Eph", chapter: 2, verse: 8 },
  { book: "Heb", chapter: 11, verse: 1 },
  { book: "Jas", chapter: 1, verse: 5 },
  { book: "1Pe", chapter: 5, verse: 7 },
  { book: "Rev", chapter: 21, verse: 4 },
  { book: "Gen", chapter: 1, verse: 1 },
  { book: "Psa", chapter: 119, verse: 105 },
  { book: "Mic", chapter: 6, verse: 8 },
  { book: "Gal", chapter: 5, verse: 22 },
  { book: "2Ti", chapter: 1, verse: 7 },
  { book: "Neh", chapter: 8, verse: 10 },
  { book: "Col", chapter: 3, verse: 23 },
  { book: "Luk", chapter: 6, verse: 31 },
  { book: "Psa", chapter: 37, verse: 4 },
  { book: "Isa", chapter: 41, verse: 10 },
  { book: "Mat", chapter: 6, verse: 33 },
  { book: "Rom", chapter: 5, verse: 8 },
  { book: "Psa", chapter: 27, verse: 1 },
  { book: "Jhn", chapter: 14, verse: 6 },
  { book: "Pro", chapter: 16, verse: 3 },
];

function dayIndex(date = new Date()): number {
  const start = Date.UTC(2020, 0, 1);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.floor((today - start) / 86400000);
  return ((days % VOTD_REFERENCES.length) + VOTD_REFERENCES.length) % VOTD_REFERENCES.length;
}

export type VerseOfDayRef = { book: string; bookName: string; chapter: number; verse: number };

export function getVerseOfDayRef(date = new Date()): VerseOfDayRef {
  const ref = VOTD_REFERENCES[dayIndex(date)];
  const bookMeta = findBookByAbbr(ref.book);
  return {
    ...ref,
    bookName: bookMeta?.name ?? ref.book,
  };
}

export function formatVerseReference(ref: VerseOfDayRef): string {
  return `${ref.bookName} ${ref.chapter}:${ref.verse}`;
}
