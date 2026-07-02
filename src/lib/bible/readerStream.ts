import type { PassageHeading, PassageVerse, PoetryBlock } from "@/lib/bible/api";
import { inlinePlatesForChapter } from "@/lib/bible/biblePlates";
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
    const plates = inlinePlatesForChapter(ch.bookAbbr, ch.chapter);
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

/** Bump when spread split layout changes — forces paginator remeasure in ReaderPage. */
export const READER_PAGINATOR_SPLIT_REVISION = 18;

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
  const rightEnd = splits[2];
  return (
    splits.length >= 3 &&
    leftEnd > 0 &&
    leftEnd < streamLength &&
    rightEnd != null &&
    rightEnd > leftEnd
  );
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
  let leftEnd = start + Math.max(1, Math.floor(len * 0.48));
  if (stream[leftEnd]?.kind !== "verse") {
    for (let i = leftEnd; i > start; i--) {
      if (stream[i - 1]?.kind === "verse") {
        leftEnd = i;
        break;
      }
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

/** True when spread splits look like one boundary per spread (right page jumps to next spread). */
export function spreadSplitsNeedPagePairRepair(
  stream: ReaderStreamUnit[],
  splits: number[],
): boolean {
  if (!isStreamSplitsReady(splits, stream.length) || splits.length < 3) return false;

  const left = sliceReaderStreamRange(stream, splits[0]!, splits[1]!, 0);
  const right = sliceReaderStreamRange(stream, splits[1]!, splits[2]!, 1);
  if (!left?.verseGroups.length || !right?.verseGroups.length) return false;

  const leftLastGroup = left.verseGroups.at(-1)!;
  const rightFirstGroup = right.verseGroups[0]!;
  const leftLastVerse = leftLastGroup.verses.at(-1)?.number;
  const rightFirstVerse = rightFirstGroup.verses[0]?.number;

  if (
    right.startsWithChapterHeader &&
    leftLastGroup.chapter === rightFirstGroup.chapter &&
    rightFirstVerse === 1 &&
    leftLastVerse != null &&
    leftLastVerse > 1
  ) {
    return true;
  }

  if (
    leftLastGroup.chapter === rightFirstGroup.chapter &&
    leftLastVerse != null &&
    rightFirstVerse != null &&
    rightFirstVerse <= leftLastVerse
  ) {
    return true;
  }

  if (
    right.startsWithChapterHeader &&
    rightFirstVerse === 1 &&
    leftLastGroup.chapter < rightFirstGroup.chapter &&
    leftLastVerse != null
  ) {
    let lastVerseInLeftChapter = 0;
    for (const unit of stream) {
      if (unit.kind === "verse" && unit.chapter === leftLastGroup.chapter) {
        lastVerseInLeftChapter = Math.max(lastVerseInLeftChapter, unit.verse.number);
      }
    }
    if (leftLastVerse < lastVerseInLeftChapter) return true;
  }

  return false;
}

/** True when splits already alternate left/right boundaries ([0, left, spreadEnd, left, spreadEnd, …]). */
export function spreadSplitsAlreadyPaired(
  splits: number[],
  streamLength: number,
): boolean {
  if (splits.length < 4 || splits.length % 2 !== 0) return false;
  if (!isStreamSplitsReady(splits, streamLength)) return false;
  for (let spreadIdx = 0; spreadIdx + 2 < splits.length; spreadIdx += 2) {
    const leftStart = splits[spreadIdx]!;
    const leftEnd = splits[spreadIdx + 1]!;
    const spreadEnd = splits[spreadIdx + 2]!;
    if (leftEnd <= leftStart || spreadEnd <= leftEnd) return false;
  }
  return true;
}

/**
 * Expand spread-only boundaries ([0, spreadEnd1, spreadEnd2, …]) into measured-style
 * left/right page pairs so each spread turn shows a continuation, not the next spread.
 */
export function repairSpreadPagePairSplits(
  splits: number[],
  stream: ReaderStreamUnit[],
): number[] {
  if (!isStreamSplitsReady(splits, stream.length) || splits.length < 3) return splits;
  if (spreadSplitsAlreadyPaired(splits, stream.length)) return splits;
  if (!spreadSplitsNeedPagePairRepair(stream, splits)) return splits;

  const spreadEnds = splits.slice(1);
  const paired: number[] = [0];
  let start = 0;
  for (const spreadEnd of spreadEnds) {
    if (spreadEnd <= start) continue;
    if (spreadEnd <= start + 1) {
      paired.push(spreadEnd);
      start = spreadEnd;
      continue;
    }
    const mid = synthesizeSpreadLeftBoundaryInRange(start, spreadEnd, stream);
    if (mid > start && mid < spreadEnd) paired.push(mid);
    paired.push(spreadEnd);
    start = spreadEnd;
  }
  return paired;
}

/**
 * Normalize spread splits once the paginator has finished measuring the full stream.
 * Never fabricates a two-page view of the entire adjacent-chapter stream while measuring.
 */
export function ensureSpreadPageSplits(
  splits: number[],
  stream: ReaderStreamUnit[],
): number[] {
  const streamLength = stream.length;
  if (streamLength === 0) return splits;
  if (!isStreamSplitsReady(splits, streamLength)) return splits;

  let normalized = repairSpreadPagePairSplits(splits, stream);

  // [0, end] puts the whole stream on the left page and leaves the right blank.
  if (normalized.length === 2 && streamLength > 2) {
    const mid = synthesizeSpreadLeftBoundaryInRange(0, streamLength, stream);
    if (mid > 0 && mid < streamLength) {
      normalized = [0, mid, streamLength];
    }
  }

  return normalized;
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
  const empty = {
    left: { start: 0, end: 0 },
    right: { start: 0, end: 0 },
  };
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
      right:
        rightEnd > mid
          ? { start: mid, end: rightEnd }
          : { start: mid, end: mid },
    };
  }

  return empty;
}

/** Provisional left/right boundaries while the paginator is still measuring. */
export function interimSpreadDisplaySplits(
  splits: number[],
  stream: ReaderStreamUnit[],
): number[] {
  const streamLength = stream.length;
  if (streamLength === 0) return splits;
  if (isSpreadDoubleColumnSplitsReady(splits, streamLength)) return splits;
  // Never fabricate a split across prev/current/next chapters — it puts the wrong
  // verses on the right pane (e.g. Joshua 15 on the right while Joshua 13:14 is on the left).
  const chapterHeaders = stream.filter((u) => u.kind === "chapter-header").length;
  if (chapterHeaders !== 1) return splits;
  const wholeStream = [0, streamLength];
  if (!isStreamSplitsReady(wholeStream, streamLength)) return splits;
  return ensureSpreadPageSplits(wholeStream, stream);
}

/** True when measured splits define a full left/right pair for this spread. */
export function spreadPaneSplitsReady(
  splits: number[],
  spreadPageIdx: number,
  streamLength: number,
): boolean {
  const ranges = spreadPaneStreamRanges(splits, spreadPageIdx, streamLength);
  return ranges.left.end > ranges.left.start && ranges.right.end > ranges.right.start;
}

/** Even page index of the spread that contains a verse (searches left then right panes). */
export function findSpreadPageForVerse(
  stream: ReaderStreamUnit[],
  splits: number[],
  bookAbbr: string,
  chapter: number,
  verse: number,
): number {
  if (!isStreamSplitsReady(splits, stream.length)) return 0;
  let found = 0;
  for (let spreadIdx = 0; spreadIdx < splits.length - 1; spreadIdx += 2) {
    for (const side of ["left", "right"] as const) {
      const slice = sliceReaderSpreadPane(stream, splits, spreadIdx, side, stream.length);
      const containsVerse = slice?.verseGroups.some(
        (g) =>
          g.bookAbbr === bookAbbr &&
          g.chapter === chapter &&
          g.verses.some((v) => v.number === verse),
      );
      if (containsVerse) found = spreadIdx;
    }
  }
  return found;
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

/**
 * Spread anchor when each facing spread uses left/right panes (double-column mode).
 * Lands on the first spread whose left pane contains the chapter opening — not the
 * prior book on the left with the new chapter only on the right.
 */
export function spreadPageForChapterStartLeftPane(
  stream: ReaderStreamUnit[],
  splits: number[],
  bookAbbr: string,
  chapter: number,
): number {
  if (!isStreamSplitsReady(splits, stream.length)) return 0;
  const headerIdx = findChapterStartStreamIndex(stream, bookAbbr, chapter);
  if (headerIdx < 0) return 0;

  if (isSpreadDoubleColumnSplitsReady(splits, stream.length)) {
    for (let spreadIdx = 0; spreadIdx < splits.length - 1; spreadIdx += 2) {
      const { left } = spreadPaneStreamRanges(splits, spreadIdx, stream.length);
      if (left.end <= left.start) continue;
      if (headerIdx >= left.start && headerIdx < left.end) {
        return spreadIdx;
      }
    }
    for (let spreadIdx = 0; spreadIdx < splits.length - 1; spreadIdx += 2) {
      const left = sliceReaderSpreadPane(stream, splits, spreadIdx, "left", stream.length);
      const opensChapter = left?.verseGroups.some(
        (g) => g.bookAbbr === bookAbbr && g.chapter === chapter,
      );
      if (opensChapter) return spreadIdx;
    }
  }

  return spreadPageForChapterStart(stream, splits, bookAbbr, chapter);
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
