import { getNextChapterRef, getPrevChapterRef, type ChapterRef } from "./chapterNav";

/** A reading window belongs to one biblical book. Chapter navigation itself
 * still crosses books, but read-ahead must not pour the next book into this one. */
export function readerBookNeighbor(bookAbbr: string, ref: ChapterRef | null): ChapterRef | null {
  return ref?.book.abbr === bookAbbr ? ref : null;
}

export function readerBookNeighbors(bookAbbr: string, chapter: number) {
  return {
    prev: readerBookNeighbor(bookAbbr, getPrevChapterRef(bookAbbr, chapter)),
    next: readerBookNeighbor(bookAbbr, getNextChapterRef(bookAbbr, chapter)),
  };
}
