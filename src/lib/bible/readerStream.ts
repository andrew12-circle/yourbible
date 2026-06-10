import type { PassageHeading, PassageVerse } from "@/lib/bible/api";

/** Chapter title block above the article on pages where a chapter begins. */
export const CHAPTER_HEADER_RESERVE_PX = 96;

export interface ReaderChapterPassage {
  bookAbbr: string;
  bookName: string;
  chapter: number;
  verses: PassageVerse[];
  paragraphStarts: number[];
  headings: PassageHeading[];
}

export type ReaderStreamUnit =
  | { kind: "chapter-header"; bookAbbr: string; bookName: string; chapter: number }
  | { kind: "verse"; bookAbbr: string; bookName: string; chapter: number; verse: PassageVerse };

export function chapterStreamKey(bookAbbr: string, chapter: number): string {
  return `${bookAbbr}|${chapter}`;
}

/** Flatten chapters into a continuous reading stream with chapter headers. */
export function buildReaderStream(chapters: ReaderChapterPassage[]): ReaderStreamUnit[] {
  const stream: ReaderStreamUnit[] = [];
  for (const ch of chapters) {
    if (ch.verses.length === 0) continue;
    stream.push({
      kind: "chapter-header",
      bookAbbr: ch.bookAbbr,
      bookName: ch.bookName,
      chapter: ch.chapter,
    });
    for (const verse of ch.verses) {
      stream.push({
        kind: "verse",
        bookAbbr: ch.bookAbbr,
        bookName: ch.bookName,
        chapter: ch.chapter,
        verse,
      });
    }
  }
  return stream;
}

export function areSameStreamSplits(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function isStreamSplitsReady(splits: number[], streamLength: number): boolean {
  if (streamLength === 0) return true;
  if (splits.length < 2) return false;
  if (splits[0] !== 0) return false;
  if (splits[splits.length - 1] !== streamLength) return false;
  for (let i = 1; i < splits.length; i++) {
    if (splits[i]! <= splits[i - 1]!) return false;
  }
  return true;
}

export function streamPageCount(splits: number[], streamLength: number): number {
  if (streamLength === 0) return 1;
  return isStreamSplitsReady(splits, streamLength) ? splits.length - 1 : 1;
}

export function findChapterHeaderStreamIndex(
  stream: ReaderStreamUnit[],
  bookAbbr: string,
  chapter: number,
): number {
  return stream.findIndex(
    (u) => u.kind === "chapter-header" && u.bookAbbr === bookAbbr && u.chapter === chapter,
  );
}

/** Spread anchor: even page index that shows the target chapter start. */
export function spreadPageForChapterStart(
  stream: ReaderStreamUnit[],
  splits: number[],
  bookAbbr: string,
  chapter: number,
): number {
  if (!isStreamSplitsReady(splits, stream.length)) return 0;
  const headerIdx = findChapterHeaderStreamIndex(stream, bookAbbr, chapter);
  if (headerIdx < 0) return 0;
  let pageIdx = 0;
  for (let p = 0; p < splits.length - 1; p++) {
    const start = splits[p]!;
    const end = splits[p + 1]!;
    if (headerIdx >= start && headerIdx < end) {
      pageIdx = p;
      break;
    }
  }
  return pageIdx % 2 === 0 ? pageIdx : Math.max(0, pageIdx - 1);
}

/** Spread anchor showing the final page of a chapter (used when paging backward into a chapter). */
export function spreadPageForChapterEnd(
  stream: ReaderStreamUnit[],
  splits: number[],
  bookAbbr: string,
  chapter: number,
): number {
  if (!isStreamSplitsReady(splits, stream.length)) return 0;
  let lastPage = 0;
  for (let p = 0; p < splits.length - 1; p++) {
    const slice = sliceReaderPage(stream, splits, p);
    if (
      slice?.verseGroups.some(
        (g) => g.bookAbbr === bookAbbr && g.chapter === chapter,
      )
    ) {
      lastPage = p;
    }
  }
  return lastPage % 2 === 0 ? lastPage : Math.max(0, lastPage - 1);
}

export interface ReaderPageSlice {
  pageIdx: number;
  startsWithChapterHeader: Extract<ReaderStreamUnit, { kind: "chapter-header" }> | null;
  verseGroups: {
    bookAbbr: string;
    bookName: string;
    chapter: number;
    verses: PassageVerse[];
  }[];
  primaryChapter: { bookAbbr: string; bookName: string; chapter: number } | null;
  anchorVerse: number | null;
}

export function sliceReaderPage(
  stream: ReaderStreamUnit[],
  splits: number[],
  pageIdx: number,
): ReaderPageSlice | null {
  if (!isStreamSplitsReady(splits, stream.length)) return null;
  const start = splits[pageIdx];
  const end = splits[pageIdx + 1];
  if (start == null || end == null || start >= end) return null;

  const startsWithChapterHeader =
    stream[start]?.kind === "chapter-header"
      ? (stream[start] as Extract<ReaderStreamUnit, { kind: "chapter-header" }>)
      : null;

  const verseGroups: ReaderPageSlice["verseGroups"] = [];
  let current: ReaderPageSlice["verseGroups"][number] | null = null;
  for (let i = start; i < end; i++) {
    const unit = stream[i];
    if (!unit || unit.kind !== "verse") continue;
    if (
      !current ||
      current.bookAbbr !== unit.bookAbbr ||
      current.chapter !== unit.chapter
    ) {
      current = {
        bookAbbr: unit.bookAbbr,
        bookName: unit.bookName,
        chapter: unit.chapter,
        verses: [],
      };
      verseGroups.push(current);
    }
    current.verses.push(unit.verse);
  }

  const primary = startsWithChapterHeader
    ? {
        bookAbbr: startsWithChapterHeader.bookAbbr,
        bookName: startsWithChapterHeader.bookName,
        chapter: startsWithChapterHeader.chapter,
      }
    : verseGroups[0]
      ? {
          bookAbbr: verseGroups[0].bookAbbr,
          bookName: verseGroups[0].bookName,
          chapter: verseGroups[0].chapter,
        }
      : null;

  return {
    pageIdx,
    startsWithChapterHeader,
    verseGroups,
    primaryChapter: primary,
    anchorVerse: verseGroups[0]?.verses[0]?.number ?? null,
  };
}

export function paragraphStartsForChapter(
  chapters: ReaderChapterPassage[],
  bookAbbr: string,
  chapter: number,
): number[] {
  const ch = chapters.find((c) => c.bookAbbr === bookAbbr && c.chapter === chapter);
  if (!ch) return [];
  return ch.paragraphStarts.length > 0
    ? ch.paragraphStarts
    : ch.verses[0]
      ? [ch.verses[0].number]
      : [];
}

export function headingsForChapter(
  chapters: ReaderChapterPassage[],
  bookAbbr: string,
  chapter: number,
): PassageHeading[] {
  return chapters.find((c) => c.bookAbbr === bookAbbr && c.chapter === chapter)?.headings ?? [];
}

export function passageFromChapters(
  chapters: ReaderChapterPassage[],
  bookAbbr: string,
  chapter: number,
): ReaderChapterPassage | undefined {
  return chapters.find((c) => c.bookAbbr === bookAbbr && c.chapter === chapter);
}
