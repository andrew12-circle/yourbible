import type { Passage } from "@/lib/bible/api";
import type { ChapterRef } from "@/lib/bible/chapterNav";
import type { ReaderChapterPassage } from "@/lib/bible/readerStream";

export function passageToStreamChapter(
  bookAbbr: string,
  bookName: string,
  chapter: number,
  passage: Passage | undefined,
): ReaderChapterPassage | null {
  if (!passage || passage.verses.length === 0) return null;
  return {
    bookAbbr,
    bookName,
    chapter,
    verses: passage.verses,
    paragraphStarts: passage.paragraphStarts,
    headings: passage.headings,
  };
}

export function buildAdjacentStreamChapters(
  prevRef: ChapterRef | null,
  prevPassage: Passage | undefined,
  currentBookAbbr: string,
  currentBookName: string,
  currentChapter: number,
  currentPassage: Passage | undefined,
  nextRef: ChapterRef | null,
  nextPassage: Passage | undefined,
): ReaderChapterPassage[] {
  const chapters: ReaderChapterPassage[] = [];
  if (prevRef) {
    const prev = passageToStreamChapter(
      prevRef.book.abbr,
      prevRef.book.name,
      prevRef.chapter,
      prevPassage,
    );
    if (prev) chapters.push(prev);
  }
  const current = passageToStreamChapter(
    currentBookAbbr,
    currentBookName,
    currentChapter,
    currentPassage,
  );
  if (current) chapters.push(current);
  if (nextRef) {
    const next = passageToStreamChapter(
      nextRef.book.abbr,
      nextRef.book.name,
      nextRef.chapter,
      nextPassage,
    );
    if (next) chapters.push(next);
  }
  return chapters;
}
