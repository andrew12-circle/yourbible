import { describe, expect, it } from "vitest";
import type { PassageVerse } from "@/lib/bible/api";
import { buildReaderStream, sliceReaderSpreadPane } from "@/lib/bible/readerStream";
import {
  continuousReaderPageNumber,
  readReaderPageStartNumber,
  readerChapterStartPageIndex,
  withReaderPageStartNumber,
} from "@/lib/bible/readerPageNumbers";

function verses(numbers: number[]): PassageVerse[] {
  return numbers.map((number) => ({ number, text: `Verse ${number}.` }));
}

describe("continuousReaderPageNumber", () => {
  it("keeps facing pages consecutive when the right page starts a new chapter", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 11,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 12,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    // Page 0 contains Joshua 11; page 1 starts Joshua 12.
    const splits = [0, 3, stream.length];

    const left = sliceReaderSpreadPane(stream, splits, 0, "left", stream.length);
    const right = sliceReaderSpreadPane(stream, splits, 0, "right", stream.length);
    const leftNumber = continuousReaderPageNumber(stream, splits, "Jos", 11, 0);
    const rightNumber = continuousReaderPageNumber(stream, splits, "Jos", 11, 1);

    expect(readerChapterStartPageIndex(stream, splits, "Jos", 11)).toBe(0);
    expect(left?.verseGroups).toMatchObject([{ chapter: 11, verses: [{ number: 1 }, { number: 2 }] }]);
    expect(right?.verseGroups).toMatchObject([{ chapter: 12, verses: [{ number: 1 }, { number: 2 }] }]);
    expect(rightNumber).toBe(leftNumber + 1);
  });

  it("preserves the chapter's printed-style number at its actual stream page", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 11,
        verses: verses([1]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 12,
        verses: verses([1]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = [0, 2, stream.length];
    const chapterStartPage = readerChapterStartPageIndex(stream, splits, "Jos", 12);

    expect(continuousReaderPageNumber(stream, splits, "Jos", 12, chapterStartPage)).toBe(
      continuousReaderPageNumber([], [0], "Jos", 12, 0),
    );
  });

  it("carries a chapter's displayed start number through the next route", () => {
    const outgoingStream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 11,
        verses: verses([1, 2, 3, 4]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 12,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const outgoingSplits = [0, 2, 4, outgoingStream.length];
    const state = withReaderPageStartNumber(
      {},
      outgoingStream,
      outgoingSplits,
      "Jos",
      11,
      600,
      "Jos",
      12,
    );
    const nextRouteStartNumber = readReaderPageStartNumber(state, "Jos", 12);

    expect(nextRouteStartNumber).toBe(602);
    expect(
      continuousReaderPageNumber(outgoingStream, outgoingSplits, "Jos", 11, 2, 600),
    ).toBe(nextRouteStartNumber);

    const incomingStream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 11,
        verses: verses([1]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 12,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const incomingSplits = [0, 2, incomingStream.length];
    const incomingChapterStart = readerChapterStartPageIndex(incomingStream, incomingSplits, "Jos", 12);

    expect(
      continuousReaderPageNumber(
        incomingStream,
        incomingSplits,
        "Jos",
        12,
        incomingChapterStart,
        nextRouteStartNumber,
      ),
    ).toBe(nextRouteStartNumber);
  });
});
