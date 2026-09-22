import { getNextChapterRef, type ChapterRef } from "./chapterNav";
import { isStreamSplitsReady } from "./readerStream";

export interface ReaderChapterIdentity { bookAbbr: string; chapter: number }
/** Keep speculative requests bounded; navigation moves the window forward at this limit. */
export const MAX_READER_CONTINUATION_CHAPTERS = 16;

export function continuationChapterRefs(after: ReaderChapterIdentity, count: number): ChapterRef[] {
  const refs: ChapterRef[] = [];
  let edge = after;
  for (let i = 0; i < Math.min(MAX_READER_CONTINUATION_CHAPTERS, Math.max(0, count)); i++) {
    const next = getNextChapterRef(edge.bookAbbr, edge.chapter);
    if (!next) break;
    refs.push(next);
    edge = { bookAbbr: next.book.abbr, chapter: next.chapter };
  }
  return refs;
}

/** Restore the exact loaded extent when returning to an earlier reading window. */
export function continuationCountThrough(after: ReaderChapterIdentity, through?: ReaderChapterIdentity): number {
  if (!through) return 0;
  const index = continuationChapterRefs(after, MAX_READER_CONTINUATION_CHAPTERS)
    .findIndex(ref => ref.book.abbr === through.bookAbbr && ref.chapter === through.chapter);
  return index < 0 ? 0 : index + 1;
}

/** The last measured page may be partial. Keep a complete next spread ahead of the reader. */
export function readerNeedsContinuation(splits: number[], length: number, page: number, pagesPerTurn: number): boolean {
  if (!length || !isStreamSplitsReady(splits, length) || page < 0 || pagesPerTurn < 1) return false;
  return splits.length - 1 <= page + 2 * pagesPerTurn;
}
