import { describe, expect, it } from "vitest";
import type { PassageVerse } from "@/lib/bible/api";
import {
  buildReaderStream,
  ensureSpreadPageSplits,
  isSpreadDoubleColumnSplitsReady,
  isStreamSplitsReady,
  sliceReaderPage,
  sliceReaderStreamRange,
  spreadPaneStreamRanges,
  spreadPageForChapterStart,
  spreadStreamRange,
  streamPageCount,
  verseGroupsFromStreamRange,
} from "@/lib/bible/readerStream";

const verses = (nums: number[]): PassageVerse[] =>
  nums.map((n) => ({ number: n, text: `v${n}` }));

describe("readerStream", () => {
  it("builds a stream with headers before each chapter", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Psa",
        bookName: "Psalms",
        chapter: 5,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Psa",
        bookName: "Psalms",
        chapter: 6,
        verses: verses([1, 2, 3]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    expect(stream.map((u) => u.kind)).toEqual([
      "chapter-header",
      "verse",
      "verse",
      "chapter-header",
      "verse",
      "verse",
      "verse",
    ]);
  });

  it("inserts illustration plates before chapter headers and mid-chapter verses", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Gen",
        bookName: "Genesis",
        chapter: 1,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "2Sa",
        bookName: "2 Samuel",
        chapter: 23,
        verses: verses([14, 15, 16]),
        paragraphStarts: [14],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    expect(stream.map((u) => u.kind)).toEqual([
      "plate",
      "chapter-header",
      "verse",
      "verse",
      "chapter-header",
      "verse",
      "plate",
      "verse",
      "verse",
    ]);
  });

  it("slices pages by stream indices", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Psa",
        bookName: "Psalms",
        chapter: 5,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Psa",
        bookName: "Psalms",
        chapter: 6,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 3, stream.length];
    expect(isStreamSplitsReady(splits, stream.length)).toBe(true);
    expect(streamPageCount(splits, stream.length)).toBe(2);
    const page0 = sliceReaderPage(stream, splits, 0);
    expect(page0?.verseGroups).toHaveLength(1);
    expect(page0?.verseGroups[0]?.chapter).toBe(5);
    const page1 = sliceReaderPage(stream, splits, 1);
    expect(page1?.startsWithChapterHeader?.chapter).toBe(6);
  });

  it("isSpreadDoubleColumnSplitsReady requires a left-page boundary", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Luk",
        bookName: "Luke",
        chapter: 24,
        verses: verses([1, 2, 3, 4, 5, 6]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const n = stream.length;
    expect(isSpreadDoubleColumnSplitsReady([0], n)).toBe(false);
    expect(isSpreadDoubleColumnSplitsReady([0, n], n)).toBe(false);
    expect(isSpreadDoubleColumnSplitsReady([0, 3, n], n)).toBe(true);
  });

  it("ensureSpreadPageSplits adds a right-page boundary when splits are still [0] only", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Luk",
        bookName: "Luke",
        chapter: 21,
        verses: verses([1, 2, 3, 4, 5]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const normalized = ensureSpreadPageSplits([0], stream);
    expect(normalized).toHaveLength(3);
    expect(sliceReaderStreamRange(stream, normalized[1]!, normalized[2]!, 1)?.verseGroups.length).toBeGreaterThan(0);
  });

  it("spreadPaneStreamRanges maps left and right panes for a spread", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Luk",
        bookName: "Luke",
        chapter: 21,
        verses: verses([31, 32, 38]),
        paragraphStarts: [31],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Luk",
        bookName: "Luke",
        chapter: 22,
        verses: verses([1, 2, 3, 4, 8]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 4, stream.length];
    const ranges = spreadPaneStreamRanges(splits, 0, stream.length);
    const right = sliceReaderStreamRange(stream, ranges.right.start, ranges.right.end, 1);
    expect(right?.verseGroups.some((g) => g.chapter === 22)).toBe(true);
  });

  it("sliceReaderPage reads per-page boundaries before full split readiness", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Joh",
        bookName: "John",
        chapter: 2,
        verses: verses([1, 2, 3, 4, 5, 6]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = ensureSpreadPageSplits([0], stream);
    const left = sliceReaderPage(stream, splits, 0);
    const right = sliceReaderPage(stream, splits, 1);
    expect(left?.verseGroups.length).toBeGreaterThan(0);
    expect(right?.verseGroups.length).toBeGreaterThan(0);
    expect(left?.verseGroups[0]?.verses[0]?.number).toBe(1);
    expect(
      right?.verseGroups.some((g) =>
        g.verses.some((v) => v.number > (left?.verseGroups.at(-1)?.verses.at(-1)?.number ?? 0)),
      ),
    ).toBe(true);
  });

  it("ensureSpreadPageSplits adds a right-page boundary when only [0, N] exists", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Luk",
        bookName: "Luke",
        chapter: 21,
        verses: verses([31, 32, 38]),
        paragraphStarts: [31],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Luk",
        bookName: "Luke",
        chapter: 22,
        verses: verses([1, 2, 3, 4, 8]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const normalized = ensureSpreadPageSplits([0, stream.length], stream);
    expect(normalized).toHaveLength(3);
    expect(normalized[0]).toBe(0);
    expect(normalized[2]).toBe(stream.length);
    expect(normalized[1]).toBeGreaterThan(0);
    expect(normalized[1]).toBeLessThan(stream.length);

    const rightPage = sliceReaderPage(stream, normalized, 1);
    expect(rightPage?.verseGroups.some((g) => g.chapter === 22)).toBe(true);
  });

  it("spreadStreamRange spans left and right page indices", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Luk",
        bookName: "Luke",
        chapter: 21,
        verses: verses([31, 32, 38]),
        paragraphStarts: [31],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Luk",
        bookName: "Luke",
        chapter: 22,
        verses: verses([1, 2, 3, 4, 8]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 4, stream.length];
    expect(spreadStreamRange(splits, 0, stream.length)).toEqual({ start: 0, end: stream.length });
    const groups = verseGroupsFromStreamRange(stream, 0, stream.length);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.chapter).toBe(21);
    expect(groups[1]?.chapter).toBe(22);
  });

  it("anchors chapter six on the prior spread when it starts on the right page", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Psa",
        bookName: "Psalms",
        chapter: 5,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Psa",
        bookName: "Psalms",
        chapter: 6,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 3, stream.length];
    expect(spreadPageForChapterStart(stream, splits, "Psa", 6)).toBe(0);
    expect(spreadPageForChapterStart(stream, splits, "Psa", 5)).toBe(0);
  });
});
