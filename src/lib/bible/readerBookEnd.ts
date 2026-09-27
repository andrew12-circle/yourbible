import { findBookByAbbr } from "@/data/books";
import type { PassageVerse } from "./api";
import type { ReaderChapterPassage, ReaderStreamUnit } from "./readerStream";
import { readerVerseFragment } from "./readerVerseFragments";
import { versePlainText } from "./verseParts";

type VerseGroup = { bookAbbr: string; chapter: number; verses: PassageVerse[] };

/** Balance only the physical page containing the complete last verse of a book,
 * never the provisional end of a loaded chapter/window or an earlier fragment. */
function completesBook(
  bookAbbr: string, chapter: number, verse: PassageVerse, end: number,
  chapters: readonly ReaderChapterPassage[],
): boolean {
  const book = findBookByAbbr(bookAbbr);
  if (!book || chapter !== book.chapters) return false;
  const last = chapters.find(ch => ch.bookAbbr === bookAbbr && ch.chapter === chapter)?.verses.at(-1);
  return !!last && last.number === verse.number && end === versePlainText(last).length
    && versePlainText(verse) === versePlainText(last);
}

export function readerPageEndsBook(
  groups: readonly VerseGroup[], chapters: readonly ReaderChapterPassage[],
): boolean {
  const group = groups.at(-1), verse = group?.verses.at(-1);
  if (!group || !verse) return false;
  const fragment = readerVerseFragment(verse), original = fragment?.original ?? verse;
  return completesBook(group.bookAbbr, group.chapter, original,
    fragment?.end ?? versePlainText(original).length, chapters);
}

/** Same decision on the original units used by the hidden page measurement. */
export function readerStreamEndsBook(
  slice: readonly ReaderStreamUnit[], chapters: readonly ReaderChapterPassage[],
): boolean {
  for (let i = slice.length - 1; i >= 0; i--) {
    const unit = slice[i];
    if (unit.kind === "verse") {
      return completesBook(unit.bookAbbr, unit.chapter, unit.verse,
        unit.verseRange?.end ?? versePlainText(unit.verse).length, chapters);
    }
  }
  return false;
}
