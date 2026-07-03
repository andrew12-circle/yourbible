import { describe, expect, it } from "vitest";
import type { PassageVerse } from "@/lib/bible/api";
import {
  buildReaderStream,
  ensureSpreadPageSplits,
  isSpreadDoubleColumnSplitsReady,
  isStreamSplitsReady,
  repairSpreadPagePairSplits,
  spreadSplitsNeedPagePairRepair,
  findSpreadPageForVerse,
  spreadPaneSplitsReady,
  sliceReaderPage,
  sliceReaderSpreadPane,
  sliceReaderStreamRange,
  spreadPaneStreamRanges,
  interimSpreadDisplaySplits,
  repairSpreadPagePairSplits,
  spreadSplitsAlreadyPaired,
  spreadPageForChapterStart,
  spreadPageForChapterStartLeftPane,
  spreadStreamRange,
  streamPageCount,
  synthesizeSpreadLeftBoundaryInRange,
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

  it("only inserts plates for the focused chapter in adjacent streams", () => {
    const chapters = [
      {
        bookAbbr: "Gen",
        bookName: "Genesis",
        chapter: 12,
        verses: verses([1, 2, 14, 15]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Gen",
        bookName: "Genesis",
        chapter: 13,
        verses: verses([1, 2, 3]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Gen",
        bookName: "Genesis",
        chapter: 14,
        verses: verses([1, 2, 18]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ];
    const stream = buildReaderStream(chapters, {
      plateFocus: { bookAbbr: "Gen", chapter: 13 },
    });
    expect(stream.some((u) => u.kind === "plate")).toBe(false);

    const gen12 = buildReaderStream(chapters, {
      plateFocus: { bookAbbr: "Gen", chapter: 12 },
    });
    const plateChapters = new Set(
      gen12.filter((u) => u.kind === "plate").map((u) => (u.kind === "plate" ? u.chapter : 0)),
    );
    expect(plateChapters).toEqual(new Set([12]));
    expect(gen12.some((u) => u.kind === "plate")).toBe(true);
  });

  it("dedupes repeated image URLs across the stream", () => {
    const crucifixionStream = buildReaderStream(
      [
        {
          bookAbbr: "Mat",
          bookName: "Matthew",
          chapter: 27,
          verses: verses([1]),
          paragraphStarts: [1],
          headings: [],
          poetryBlocks: [],
        },
        {
          bookAbbr: "Mrk",
          bookName: "Mark",
          chapter: 15,
          verses: verses([1]),
          paragraphStarts: [1],
          headings: [],
          poetryBlocks: [],
        },
      ],
      { dedupeImageUrls: true },
    );
    const urls = crucifixionStream
      .filter((u) => u.kind === "plate")
      .map((u) => (u.kind === "plate" ? u.plate.imageUrl : ""));
    expect(urls.length).toBe(1);
    expect(new Set(urls).size).toBe(1);
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

  it("ensureSpreadPageSplits leaves incomplete splits unchanged while measuring", () => {
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
    expect(ensureSpreadPageSplits([0], stream)).toEqual([0]);
  });

  it("ensureSpreadPageSplits expands whole-stream splits into left/right pages", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Luk",
        bookName: "Luke",
        chapter: 21,
        verses: verses([1, 2, 3, 4, 5, 6, 7, 8]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const expanded = ensureSpreadPageSplits([0, stream.length], stream);
    expect(expanded.length).toBe(3);
    expect(expanded[0]).toBe(0);
    expect(expanded[expanded.length - 1]).toBe(stream.length);
    expect(expanded[1]).toBeGreaterThan(0);
    expect(expanded[1]).toBeLessThan(stream.length);
    const right = sliceReaderSpreadPane(stream, expanded, 0, "right", stream.length);
    expect(right?.verseGroups.length).toBeGreaterThan(0);
  });

  it("repairSpreadPagePairSplits expands spread-only boundaries", () => {
    const longVerses = verses(Array.from({ length: 24 }, (_, i) => i + 1));
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 4,
        verses: longVerses,
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const mid = Math.floor(stream.length * 0.4);
    const spreadOnly = [0, mid, stream.length];
    const paired = repairSpreadPagePairSplits(spreadOnly, stream);
    expect(paired.length).toBeGreaterThanOrEqual(spreadOnly.length);
    expect(paired[0]).toBe(0);
    expect(paired[paired.length - 1]).toBe(stream.length);
  });

  it("spreadPaneStreamRanges continues a long chapter across multiple spreads", () => {
    const longVerses = verses(Array.from({ length: 40 }, (_, i) => i + 1));
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 4,
        verses: longVerses,
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 10, 20, 30, 40, stream.length];
    const spread1Left = sliceReaderSpreadPane(stream, splits, 2, "left", stream.length);
    expect(spread1Left?.startsWithChapterHeader).toBeNull();
    expect(spread1Left?.verseGroups[0]?.verses[0]?.number).toBeGreaterThan(1);
    expect(streamPageCount(splits, stream.length)).toBe(5);
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
    const splits = [
      0,
      synthesizeSpreadLeftBoundaryInRange(0, stream.length, stream),
      stream.length,
    ];
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

  it("synthesizeSpreadLeftBoundaryInRange splits within a stream segment", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Luk",
        bookName: "Luke",
        chapter: 21,
        verses: verses([1, 2, 3, 4, 5, 6]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const mid = synthesizeSpreadLeftBoundaryInRange(1, stream.length, stream);
    expect(mid).toBeGreaterThan(1);
    expect(mid).toBeLessThan(stream.length);
  });

  it("spreadPaneStreamRanges maps consecutive chapters to left and right pages", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Gen",
        bookName: "Genesis",
        chapter: 1,
        verses: verses([1, 2, 3]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Gen",
        bookName: "Genesis",
        chapter: 2,
        verses: verses([1, 2, 3]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Gen",
        bookName: "Genesis",
        chapter: 3,
        verses: verses([1, 2, 3]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Gen",
        bookName: "Genesis",
        chapter: 4,
        verses: verses([1, 2, 3]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const ch1End = stream.findIndex(
      (u) => u.kind === "chapter-header" && u.chapter === 2,
    );
    const ch2End = stream.findIndex(
      (u) => u.kind === "chapter-header" && u.chapter === 3,
    );
    const ch3End = stream.findIndex(
      (u) => u.kind === "chapter-header" && u.chapter === 4,
    );
    const splits = [0, ch1End, ch2End, ch3End, stream.length];
    const spread0 = spreadPaneStreamRanges(splits, 0, stream.length);
    const left = sliceReaderStreamRange(stream, spread0.left.start, spread0.left.end, 0);
    const right = sliceReaderStreamRange(stream, spread0.right.start, spread0.right.end, 1);
    expect(left?.verseGroups.some((g) => g.chapter === 1)).toBe(true);
    expect(right?.verseGroups.some((g) => g.chapter === 2)).toBe(true);
    expect(right?.verseGroups.some((g) => g.chapter === 3)).toBe(false);
  });

  it("spreadPaneStreamRanges continues mid-chapter across spread turns", () => {
    const longVerses = verses(Array.from({ length: 40 }, (_, i) => i + 1));
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 4,
        verses: longVerses,
        paragraphStarts: [1],
        headings: [{ beforeVerse: 1, text: "Memorial Stones" }],
        poetryBlocks: [],
      },
    ]);
    const chHeader = stream.findIndex((u) => u.kind === "chapter-header");
    const mid = synthesizeSpreadLeftBoundaryInRange(chHeader, stream.length, stream);
    const splits = [0, mid, mid + 8, mid + 20, stream.length];
    const spread1Left = sliceReaderSpreadPane(stream, splits, 2, "left", stream.length);
    expect(spread1Left?.startsWithChapterHeader).toBeNull();
    expect(spread1Left?.verseGroups[0]?.verses[0]?.number).toBeGreaterThan(1);
  });

  it("ensureSpreadPageSplits passes through valid page-paired splits", () => {
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
    const ch22 = stream.findIndex((u) => u.kind === "chapter-header" && u.chapter === 22);
    const paired = [0, ch22 - 1, ch22, ch22 + 2, stream.length];
    const normalized = ensureSpreadPageSplits(paired, stream);
    expect(normalized).toEqual(paired);

    const rightPage = sliceReaderSpreadPane(stream, normalized, 0, "right", stream.length);
    expect(rightPage?.verseGroups.some((g) => g.chapter === 21)).toBe(true);
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

  it("spreadPageForChapterStartLeftPane opens on left pane after a book boundary", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jhn",
        bookName: "John",
        chapter: 21,
        verses: verses([1, 2, 3, 4]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Act",
        bookName: "Acts",
        chapter: 1,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 5, 7, stream.length];
    expect(spreadPageForChapterStart(stream, splits, "Act", 1)).toBe(0);
    expect(spreadPageForChapterStartLeftPane(stream, splits, "Act", 1)).toBe(2);
    const left = sliceReaderSpreadPane(stream, splits, 2, "left", stream.length);
    expect(left?.verseGroups.some((g) => g.bookAbbr === "Act" && g.chapter === 1)).toBe(true);
    expect(left?.verseGroups.some((g) => g.bookAbbr === "Jhn")).toBe(false);
  });

  it("interimSpreadDisplaySplits fabricates left/right boundaries while measuring", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 14,
        verses: verses(Array.from({ length: 15 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const interim = interimSpreadDisplaySplits([0], stream);
    expect(isSpreadDoubleColumnSplitsReady(interim, stream.length)).toBe(true);
    const left = sliceReaderSpreadPane(stream, interim, 0, "left", stream.length);
    const right = sliceReaderSpreadPane(stream, interim, 0, "right", stream.length);
    expect(left?.verseGroups.length).toBeGreaterThan(0);
    expect(right?.verseGroups.length).toBeGreaterThan(0);
  });

  it("interimSpreadDisplaySplits does not guess across adjacent chapters", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 12,
        verses: verses(Array.from({ length: 24 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 13,
        verses: verses(Array.from({ length: 33 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 14,
        verses: verses(Array.from({ length: 15 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const interim = interimSpreadDisplaySplits([0], stream);
    expect(interim).toEqual([0]);
    expect(isSpreadDoubleColumnSplitsReady(interim, stream.length)).toBe(false);
  });

  it("repairSpreadPagePairSplits leaves already-paired BookPaginator-style splits alone", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 13,
        verses: verses(Array.from({ length: 33 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const paired = [0, 15, 29, stream.length];
    expect(spreadSplitsAlreadyPaired(paired, stream.length)).toBe(true);
    expect(repairSpreadPagePairSplits(paired, stream)).toEqual(paired);
    const left = sliceReaderSpreadPane(stream, paired, 0, "left", stream.length);
    const right = sliceReaderSpreadPane(stream, paired, 0, "right", stream.length);
    const leftLast = left!.verseGroups.at(-1)!.verses.at(-1)!.number;
    const rightFirst = right!.verseGroups[0]!.verses[0]!.number;
    expect(rightFirst).toBeGreaterThan(leftLast);
  });

  it("spreadPaneStreamRanges returns empty panes when splits are incomplete", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 13,
        verses: verses(Array.from({ length: 20 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const ranges = spreadPaneStreamRanges([0], 0, stream.length);
    expect(ranges.left.end).toBe(0);
    expect(ranges.right.end).toBe(0);
    expect(sliceReaderSpreadPane(stream, [0], 0, "right", stream.length)).toBeNull();
  });

  it("right pane continues immediately after left pane in stream order", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 13,
        verses: verses(Array.from({ length: 30 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 12, 24, stream.length];
    expect(spreadPaneSplitsReady(splits, 0, stream.length)).toBe(true);
    const left = sliceReaderSpreadPane(stream, splits, 0, "left", stream.length);
    const right = sliceReaderSpreadPane(stream, splits, 0, "right", stream.length);
    const leftLast = left!.verseGroups.at(-1)!.verses.at(-1)!.number;
    const rightFirst = right!.verseGroups[0]!.verses[0]!.number;
    expect(rightFirst).toBe(leftLast + 1);
    expect(right!.verseGroups[0]!.chapter).toBe(13);
  });

  it("findSpreadPageForVerse locates spread containing a verse", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 13,
        verses: verses(Array.from({ length: 30 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 10, 20, 30, stream.length];
    const spread = findSpreadPageForVerse(stream, splits, "Jos", 13, 15);
    expect(spread).toBe(0);
    const right = sliceReaderSpreadPane(stream, splits, spread, "right", stream.length);
    expect(
      right?.verseGroups.some((g) => g.verses.some((v) => v.number === 15)),
    ).toBe(true);
  });
});
