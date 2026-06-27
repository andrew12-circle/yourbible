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
});
