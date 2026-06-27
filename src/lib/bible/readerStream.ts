import type { PassageHeading, PassageVerse, PoetryBlock } from "@/lib/bible/api";
import { platesForChapter } from "@/lib/bible/biblePlates";
import type { BiblePlate } from "@/lib/bible/biblePlates";

/** Chapter title block above the article on pages where a chapter begins. */
export const CHAPTER_HEADER_RESERVE_PX = 96;

export interface ReaderChapterPassage {
  bookAbbr: string;
  bookName: string;
  chapter: number;
  verses: PassageVerse[];
  paragraphStarts: number[];
  headings: PassageHeading[];
  poetryBlocks: PoetryBlock[];
}

export type ReaderStreamUnit =
  | { kind: "chapter-header"; bookAbbr: string; bookName: string; chapter: number }
  | {
      kind: "plate";
      bookAbbr: string;
      bookName: string;
      chapter: number;
      plate: BiblePlate;
    }
  | { kind: "verse"; bookAbbr: string; bookName: string; chapter: number; verse: PassageVerse };

export function chapterStreamKey(bookAbbr: string, chapter: number): string {
  return `${bookAbbr}|${chapter}`;
}

/** Flatten chapters into a continuous reading stream with plates, headers, and verses. */
export function buildReaderStream(chapters: ReaderChapterPassage[]): ReaderStreamUnit[] {
  const stream: ReaderStreamUnit[] = [];
  for (const ch of chapters) {
    if (ch.verses.length === 0) continue;
    const plates = platesForChapter(ch.bookAbbr, ch.chapter);
    for (const plate of plates.filter((p) => p.beforeVerse === 1)) {
      stream.push({
        kind: "plate",
        bookAbbr: ch.bookAbbr,
        bookName: ch.bookName,
        chapter: ch.chapter,
        plate,
      });
    }
    stream.push({
      kind: "chapter-header",
      bookAbbr: ch.bookAbbr,
      bookName: ch.bookName,
      chapter: ch.chapter,
    });
    for (const verse of ch.verses) {
      for (const plate of plates.filter(
        (p) => p.beforeVerse === verse.number && !(verse.number === 1 && p.beforeVerse === 1),
      )) {
        stream.push({
          kind: "plate",
          bookAbbr: ch.bookAbbr,
          bookName: ch.bookName,
          chapter: ch.chapter,
          plate,
        });
      }
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

/**
 * Spread + two columns per page needs a measured left/right boundary ([0, left, …, end]),
 * not a provisional [0, end] slice that dumps half the chapter per page.
 */
export function isSpreadDoubleColumnSplitsReady(
  splits: number[],
  streamLength: number,
): boolean {
  if (!isStreamSplitsReady(splits, streamLength)) return false;
  if (streamLength <= 2) return true;
  const leftEnd = splits[1] ?? 0;
  return splits.length >= 3 && leftEnd > 0 && leftEnd < streamLength;
}

export function streamPageCount(splits: number[], streamLength: number): number {
  if (streamLength === 0) return 1;
  return isStreamSplitsReady(splits, streamLength) ? splits.length - 1 : 1;
}

/** Verse-boundary split for one spread segment (stream[start:end)). */
export function synthesizeSpreadLeftBoundaryInRange(
  start: number,
  end: number,
  stream: ReaderStreamUnit[],
): number {
  if (end <= start + 1) return end;
  const len = end - start;
  const target = start + Math.max(1, Math.floor(len * 0.48));
  let leftEnd = target;
  for (let i = target; i < end; i++) {
    if (stream[i]?.kind === "chapter-header") {
      leftEnd = i;
      break;
    }
  }
  if (leftEnd <= start || leftEnd >= end) {
    leftEnd = start + Math.max(1, Math.floor(len / 2));
  }
  return leftEnd;
}

function synthesizeSpreadLeftBoundary(end: number, stream: ReaderStreamUnit[]): number {
  return synthesizeSpreadLeftBoundaryInRange(0, end, stream);
}

function countChapterHeadersInRange(
  stream: ReaderStreamUnit[],
  start: number,
  end: number,
): number {
  let count = 0;
  for (let i = start; i < end; i++) {
    if (stream[i]?.kind === "chapter-header") count += 1;
  }
  return count;
}

/** Second+ chapter header inside a spread segment — split left/right pages here. */
export function secondChapterHeaderInRange(
  stream: ReaderStreamUnit[],
  start: number,
  end: number,
): number {
  let seen = 0;
  for (let i = start; i < end; i++) {
    if (stream[i]?.kind !== "chapter-header") continue;
    seen += 1;
    if (seen >= 2) return i;
  }
  return -1;
}

/**
 * When the paginator recorded one boundary per spread (each segment holds multiple
 * chapters), expand into left/right page pairs so the open book shows ch N | ch N+1.
 */
export function expandMultiChapterSpreadSplits(
  splits: number[],
  stream: ReaderStreamUnit[],
): number[] {
  if (splits.length < 3 || splits[0] !== 0 || stream.length === 0) return splits;

  let needsExpand = false;
  for (let i = 0; i < splits.length - 1; i++) {
    if (countChapterHeadersInRange(stream, splits[i]!, splits[i + 1]!) >= 2) {
      needsExpand = true;
      break;
    }
  }
  if (!needsExpand) return splits;

  const expanded: number[] = [0];
  for (let i = 0; i < splits.length - 1; i++) {
    const start = expanded[expanded.length - 1]!;
    const end = splits[i + 1]!;
    if (end <= start) continue;

    const chapterSplit = secondChapterHeaderInRange(stream, start, end);
    if (chapterSplit > start && chapterSplit < end) expanded.push(chapterSplit);
    expanded.push(end);
  }
  return expanded;
}

/**
 * When spread pagination has not yet produced a right-page boundary ([0, N] only),
 * synthesize a left/right split at a verse boundary until measurement catches up.
 */
export function ensureSpreadPageSplits(
  splits: number[],
  stream: ReaderStreamUnit[],
): number[] {
  const streamLength = stream.length;
  if (streamLength === 0) return splits;

  let normalized = splits;

  if (normalized.length >= 3 && normalized[0] === 0) {
    const mid = normalized[1]!;
    const last = normalized[splits.length - 1]!;
    if (!(mid > 0 && mid < last)) {
      normalized = splits;
    }
  } else if (streamLength <= 2) {
    return normalized.length >= 2 && normalized[0] === 0 ? normalized : [0, streamLength];
  } else {
    const end =
      normalized.length >= 2 && normalized[0] === 0 && (normalized[normalized.length - 1] ?? 0) > 0
        ? normalized[normalized.length - 1]!
        : streamLength;
    normalized = [0, synthesizeSpreadLeftBoundary(end, stream), end];
  }

  return expandMultiChapterSpreadSplits(normalized, stream);
}

/** Slice one pane (left or right) of an open-book spread in double-column mode. */
export function sliceReaderSpreadPane(
  stream: ReaderStreamUnit[],
  splits: number[],
  spreadLeftPageIdx: number,
  side: "left" | "right",
  streamLength: number,
): ReaderPageSlice | null {
  const ranges = spreadPaneStreamRanges(splits, spreadLeftPageIdx, streamLength);
  const range = side === "left" ? ranges.left : ranges.right;
  if (range.end <= range.start) return null;
  const pageIdx = spreadLeftPageIdx + (side === "right" ? 1 : 0);
  return sliceReaderStreamRange(stream, range.start, range.end, pageIdx);
}

/** Left/right stream index ranges for one facing spread in double-column mode. */
export function spreadPaneStreamRanges(
  splits: number[],
  spreadPageIdx: number,
  streamLength: number,
): { left: { start: number; end: number }; right: { start: number; end: number } } {
  const leftStart = splits[spreadPageIdx] ?? 0;
  const mid = splits[spreadPageIdx + 1];
  const far = splits[spreadPageIdx + 2];

  if (mid != null && far != null && mid > leftStart && far > mid) {
    return {
      left: { start: leftStart, end: mid },
      right: { start: mid, end: far },
    };
  }

  if (mid != null && mid > leftStart) {
    const rightEnd = far != null && far > mid ? far : streamLength;
    return {
      left: { start: leftStart, end: mid },
      right: { start: mid, end: rightEnd },
    };
  }

  const provisionalMid = Math.max(
    leftStart + 1,
    Math.min(streamLength - 1, Math.floor(streamLength * 0.48)),
  );
  return {
    left: { start: leftStart, end: provisionalMid },
    right: { start: provisionalMid, end: streamLength },
  };
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

/** First stream index for a chapter — opening plate if present, else chapter header. */
export function findChapterStartStreamIndex(
  stream: ReaderStreamUnit[],
  bookAbbr: string,
  chapter: number,
): number {
  const headerIdx = findChapterHeaderStreamIndex(stream, bookAbbr, chapter);
  if (headerIdx < 0) return -1;
  const prev = stream[headerIdx - 1];
  if (
    prev?.kind === "plate" &&
    prev.bookAbbr === bookAbbr &&
    prev.chapter === chapter &&
    prev.plate.beforeVerse === 1
  ) {
    return headerIdx - 1;
  }
  return headerIdx;
}

/** Spread anchor: even page index that shows the target chapter start. */
export function spreadPageForChapterStart(
  stream: ReaderStreamUnit[],
  splits: number[],
  bookAbbr: string,
  chapter: number,
): number {
  if (!isStreamSplitsReady(splits, stream.length)) return 0;
  const headerIdx = findChapterStartStreamIndex(stream, bookAbbr, chapter);
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
  plates: BiblePlate[];
  isPlatePage: boolean;
  verseGroups: {
    bookAbbr: string;
    bookName: string;
    chapter: number;
    verses: PassageVerse[];
  }[];
  primaryChapter: { bookAbbr: string; bookName: string; chapter: number } | null;
  anchorVerse: number | null;
}

export function sliceReaderStreamRange(
  stream: ReaderStreamUnit[],
  start: number,
  end: number,
  pageIdx = 0,
): ReaderPageSlice | null {
  if (start < 0 || end > stream.length || start >= end) return null;

  const startsWithChapterHeader =
    stream[start]?.kind === "chapter-header"
      ? (stream[start] as Extract<ReaderStreamUnit, { kind: "chapter-header" }>)
      : stream[start + 1]?.kind === "chapter-header"
        ? (stream[start + 1] as Extract<ReaderStreamUnit, { kind: "chapter-header" }>)
        : null;

  const plates: BiblePlate[] = [];
  const verseGroups: ReaderPageSlice["verseGroups"] = [];
  let current: ReaderPageSlice["verseGroups"][number] | null = null;
  for (let i = start; i < end; i++) {
    const unit = stream[i];
    if (!unit) continue;
    if (unit.kind === "plate") {
      plates.push(unit.plate);
      continue;
    }
    if (unit.kind !== "verse") continue;
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

  const plateUnit = stream.slice(start, end).find((u) => u.kind === "plate");
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
      : plateUnit?.kind === "plate"
        ? {
            bookAbbr: plateUnit.bookAbbr,
            bookName: plateUnit.bookName,
            chapter: plateUnit.chapter,
          }
        : null;

  return {
    pageIdx,
    startsWithChapterHeader,
    plates,
    isPlatePage: plates.length > 0 && verseGroups.length === 0,
    verseGroups,
    primaryChapter: primary,
    anchorVerse: verseGroups[0]?.verses[0]?.number ?? plates[0]?.beforeVerse ?? null,
  };
}

export function sliceReaderPage(
  stream: ReaderStreamUnit[],
  splits: number[],
  pageIdx: number,
): ReaderPageSlice | null {
  if (stream.length === 0 || pageIdx < 0) return null;
  const start = splits[pageIdx];
  const end = splits[pageIdx + 1];
  if (start != null && end != null && end > start) {
    return sliceReaderStreamRange(stream, start, end, pageIdx);
  }
  if (!isStreamSplitsReady(splits, stream.length)) return null;
  return null;
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

export function poetryBlocksForChapter(
  chapters: ReaderChapterPassage[],
  bookAbbr: string,
  chapter: number,
): PoetryBlock[] {
  return chapters.find((c) => c.bookAbbr === bookAbbr && c.chapter === chapter)?.poetryBlocks ?? [];
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

/** Stream index range for one open-book spread (left page + right page). */
export function spreadStreamRange(
  splits: number[],
  spreadPageIdx: number,
  streamLength: number,
): { start: number; end: number } {
  const start = splits[spreadPageIdx] ?? 0;
  const mid = splits[spreadPageIdx + 1];
  const far = splits[spreadPageIdx + 2];
  if (mid == null) return { start, end: streamLength };
  if (far == null) return { start, end: mid };
  return { start, end: far };
}

export function verseGroupsFromStreamRange(
  stream: ReaderStreamUnit[],
  start: number,
  end: number,
): ReaderPageSlice["verseGroups"] {
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
  return verseGroups;
}
