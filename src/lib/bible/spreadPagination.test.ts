import { describe, expect, it } from "vitest";
import type { PassageVerse } from "@/lib/bible/api";
import {
  buildReaderStream,
  ensureSpreadPageSplits,
  isSpreadDoubleColumnSplitsReady,
  sliceReaderSpreadPane,
} from "@/lib/bible/readerStream";

function verses(nums: number[]): PassageVerse[] {
  return nums.map((n) => ({ number: n, text: `Verse ${n} text.` }));
}

describe("spread pagination invariants", () => {
  it("expands whole-stream splits so the right pane is never empty on spread 0", () => {
    const longVerses = verses(Array.from({ length: 24 }, (_, i) => i + 1));
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 11,
        verses: longVerses,
        paragraphStarts: [1],
        headings: [{ beforeVerse: 1, text: "Conquest of Northern Cities" }],
        poetryBlocks: [],
      },
    ]);
    const wholeStream = [0, stream.length];
    const normalized = ensureSpreadPageSplits(wholeStream, stream);
    expect(isSpreadDoubleColumnSplitsReady(normalized, stream.length)).toBe(true);

    const left = sliceReaderSpreadPane(stream, normalized, 0, "left", stream.length);
    const right = sliceReaderSpreadPane(stream, normalized, 0, "right", stream.length);
    expect(left?.verseGroups.length).toBeGreaterThan(0);
    expect(right?.verseGroups.length).toBeGreaterThan(0);
    expect(left?.verseGroups[0]?.verses[0]?.number).toBe(1);
    expect(right?.verseGroups[0]?.verses[0]?.number).toBeGreaterThan(
      left!.verseGroups.at(-1)!.verses.at(-1)!.number,
    );
  });

  it("paired splits always give rightEnd greater than leftEnd on spread 0", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 11,
        verses: verses(Array.from({ length: 23 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const paired = [0, 8, 18, stream.length];
    const normalized = ensureSpreadPageSplits(paired, stream);
    expect(normalized[1]).toBeLessThan(normalized[2]!);
    const right = sliceReaderSpreadPane(stream, normalized, 0, "right", stream.length);
    expect(right?.verseGroups.length).toBeGreaterThan(0);
  });

  it("multi-spread splits continue mid-chapter on spread 1 and spread 2", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 4,
        verses: verses(Array.from({ length: 40 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 10, 20, 30, 40, stream.length];
    const spread1Left = sliceReaderSpreadPane(stream, splits, 2, "left", stream.length);
    const spread1Right = sliceReaderSpreadPane(stream, splits, 2, "right", stream.length);
    const spread2Left = sliceReaderSpreadPane(stream, splits, 4, "left", stream.length);
    expect(spread1Left?.verseGroups.length).toBeGreaterThan(0);
    expect(spread1Right?.verseGroups.length).toBeGreaterThan(0);
    expect(spread2Left?.verseGroups.length).toBeGreaterThan(0);
    expect(spread1Left?.startsWithChapterHeader).toBeNull();
    expect(spread2Left?.verseGroups[0]?.verses[0]?.number).toBeGreaterThan(1);
  });

  it("right pane first verse follows left pane last verse in Joshua 13 spread", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 13,
        verses: verses(Array.from({ length: 33 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [{ beforeVerse: 1, text: "Unconquered Lands" }],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 15, 29, stream.length];
    const left = sliceReaderSpreadPane(stream, splits, 0, "left", stream.length);
    const right = sliceReaderSpreadPane(stream, splits, 0, "right", stream.length);
    const leftLast = left!.verseGroups.at(-1)!.verses.at(-1)!.number;
    const rightFirst = right!.verseGroups[0]!.verses[0]!.number;
    expect(leftLast).toBe(14);
    expect(rightFirst).toBe(15);
  });

  it("Joshua 14 spread continues 14:13 on left to 14:14 on right", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 14,
        verses: verses(Array.from({ length: 15 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [{ beforeVerse: 1, text: "Hebron Given to Caleb" }],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 14, stream.length];
    const left = sliceReaderSpreadPane(stream, splits, 0, "left", stream.length);
    const right = sliceReaderSpreadPane(stream, splits, 0, "right", stream.length);
    expect(left?.verseGroups.at(-1)?.verses.at(-1)?.number).toBe(13);
    expect(right?.verseGroups[0]?.verses[0]?.number).toBe(14);
    expect(right?.verseGroups[0]?.chapter).toBe(14);
  });

  it("multi-spread Joshua 14 continues on spread 1 left after spread 0 right ends", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 14,
        verses: verses(Array.from({ length: 38 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 14, 28, 35, stream.length];
    const spread0Right = sliceReaderSpreadPane(stream, splits, 0, "right", stream.length);
    const spread1Left = sliceReaderSpreadPane(stream, splits, 2, "left", stream.length);
    const rightLast = spread0Right!.verseGroups.at(-1)!.verses.at(-1)!.number;
    const nextLeftFirst = spread1Left!.verseGroups[0]!.verses[0]!.number;
    expect(nextLeftFirst).toBe(rightLast + 1);
  });
});
