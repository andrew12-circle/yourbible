import { describe, expect, it } from "vitest";
import type { PassageVerse } from "@/lib/bible/api";
import {
  buildReaderStream,
  isStreamSplitsReady,
  sliceReaderPage,
  spreadPageForChapterStart,
  streamPageCount,
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
      },
      {
        bookAbbr: "Psa",
        bookName: "Psalms",
        chapter: 6,
        verses: verses([1, 2, 3]),
        paragraphStarts: [1],
        headings: [],
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

  it("slices pages by stream indices", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Psa",
        bookName: "Psalms",
        chapter: 5,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
      },
      {
        bookAbbr: "Psa",
        bookName: "Psalms",
        chapter: 6,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
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

  it("anchors chapter six on the prior spread when it starts on the right page", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Psa",
        bookName: "Psalms",
        chapter: 5,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
      },
      {
        bookAbbr: "Psa",
        bookName: "Psalms",
        chapter: 6,
        verses: verses([1, 2]),
        paragraphStarts: [1],
        headings: [],
      },
    ]);
    const splits = [0, 3, stream.length];
    expect(spreadPageForChapterStart(stream, splits, "Psa", 6)).toBe(0);
    expect(spreadPageForChapterStart(stream, splits, "Psa", 5)).toBe(0);
  });
});
