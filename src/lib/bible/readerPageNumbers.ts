import { readerChapterPageNumber } from "@/lib/bible/bibleContents";
import {
  findChapterStartStreamIndex,
  isStreamSplitsReady,
  type ReaderStreamUnit,
} from "@/lib/bible/readerStream";

/**
 * Finds the logical reader page that contains a chapter's first visible unit.
 * The reader measures a small prev/current/next chapter stream, so that page is
 * not necessarily page zero of the current spread.
 */
export function readerChapterStartPageIndex(
  stream: ReaderStreamUnit[],
  splits: number[],
  bookAbbr: string,
  chapter: number,
): number {
  if (!isStreamSplitsReady(splits, stream.length)) return 0;

  const chapterStart = findChapterStartStreamIndex(stream, bookAbbr, chapter);
  if (chapterStart < 0) return 0;

  for (let pageIndex = 0; pageIndex + 1 < splits.length; pageIndex += 1) {
    const start = splits[pageIndex]!;
    const end = splits[pageIndex + 1]!;
    if (chapterStart >= start && chapterStart < end) return pageIndex;
  }

  return 0;
}

/**
 * Printed-style reader number for a logical page in a continuous spread.
 *
 * Always derive both facing pages from one chapter anchor. Deriving each page
 * from its own primary chapter double-counts the chapter increment whenever a
 * left page ends in one chapter and the right page begins in the next.
 */
export function continuousReaderPageNumber(
  stream: ReaderStreamUnit[],
  splits: number[],
  anchorBookAbbr: string,
  anchorChapter: number,
  pageIndex: number,
  anchorStartPageNumber = readerChapterPageNumber(anchorBookAbbr, anchorChapter),
): number {
  const anchorPageIndex = readerChapterStartPageIndex(
    stream,
    splits,
    anchorBookAbbr,
    anchorChapter,
  );
  return Math.max(
    1,
    anchorStartPageNumber + pageIndex - anchorPageIndex,
  );
}

type ReaderPageNumberAnchor = {
  bookAbbr: string;
  chapter: number;
  startPageNumber: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

/** Reads a verified chapter-start number passed by a previous/next page turn. */
export function readReaderPageStartNumber(
  state: unknown,
  bookAbbr: string,
  chapter: number,
): number | undefined {
  if (!isRecord(state) || !isRecord(state.readerPageNumberAnchor)) return undefined;
  const anchor = state.readerPageNumberAnchor as Partial<ReaderPageNumberAnchor>;
  if (
    anchor.bookAbbr !== bookAbbr ||
    anchor.chapter !== chapter ||
    !Number.isInteger(anchor.startPageNumber) ||
    anchor.startPageNumber < 1
  ) {
    return undefined;
  }
  return anchor.startPageNumber;
}

/**
 * Carries the target chapter's actual displayed start number into the next
 * route, so a long chapter cannot cause numbers to rebase after navigation.
 */
export function withReaderPageStartNumber(
  state: unknown,
  stream: ReaderStreamUnit[],
  splits: number[],
  anchorBookAbbr: string,
  anchorChapter: number,
  anchorStartPageNumber: number | undefined,
  targetBookAbbr: string,
  targetChapter: number,
): Record<string, unknown> {
  const targetStart = findChapterStartStreamIndex(stream, targetBookAbbr, targetChapter);
  const targetPageIndex = readerChapterStartPageIndex(stream, splits, targetBookAbbr, targetChapter);
  const targetStartPageNumber =
    targetStart < 0 || !isStreamSplitsReady(splits, stream.length)
      ? readerChapterPageNumber(targetBookAbbr, targetChapter)
      : continuousReaderPageNumber(
          stream,
          splits,
          anchorBookAbbr,
          anchorChapter,
          targetPageIndex,
          anchorStartPageNumber,
        );
  return {
    ...(isRecord(state) ? state : {}),
    readerPageNumberAnchor: {
      bookAbbr: targetBookAbbr,
      chapter: targetChapter,
      startPageNumber: targetStartPageNumber,
    },
  };
}
