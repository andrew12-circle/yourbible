import { BIBLE_PLATES, type BiblePlate } from "@/data/biblePlates";

export type { BiblePlate };

export function platesForChapter(bookAbbr: string, chapter: number): BiblePlate[] {
  return BIBLE_PLATES.filter(
    (p) => p.bookAbbr === bookAbbr && p.chapter === chapter,
  ).sort((a, b) => a.beforeVerse - b.beforeVerse);
}

export function platesBeforeVerse(
  bookAbbr: string,
  chapter: number,
  verse: number,
): BiblePlate[] {
  return platesForChapter(bookAbbr, chapter).filter((p) => p.beforeVerse === verse);
}

export function openingPlatesForChapter(bookAbbr: string, chapter: number): BiblePlate[] {
  return platesBeforeVerse(bookAbbr, chapter, 1);
}
