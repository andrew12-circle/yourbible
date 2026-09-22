import { describe, expect, it } from "vitest";
import { buildReaderStream, type ReaderChapterPassage } from "./readerStream";
import { fragmentReaderStream } from "./readerVerseFragments";
import { readerAppendedPagePrefix } from "./readerAppendPagination";
import { paginateReaderStream } from "./paginateReaderStream";

const chapter = (number: number): ReaderChapterPassage => ({
  bookAbbr: "Psa", bookName: "Psalms", chapter: number,
  verses: [{ number: 1, text: "one two three four five six seven eight nine ten" }],
  paragraphStarts: [1], headings: [], poetryBlocks: [],
});
const chapters = [chapter(6), chapter(7)];
const stream = fragmentReaderStream(buildReaderStream(chapters));
const prior = { layoutKey: "same geometry", chapters, stream, splits: [0, 5, 10, 16, stream.length] };
const extendedChapters = [...chapters, chapter(8)];
const extendedStream = fragmentReaderStream(buildReaderStream(extendedChapters));

describe("append-only chapter page cuts", () => {
  it("retains every completed page and refills the old final page", () => {
    const prefix = readerAppendedPagePrefix(prior, prior.layoutKey, extendedChapters, extendedStream);
    expect(prefix).toEqual([0, 5, 10, 16]);
    // A changed suffix fit must not recalculate the already-read prefix.
    const result = paginateReaderStream(extendedStream, (start, end) => end - start <= 3, prefix);
    expect(result.slice(0, 4)).toEqual(prefix);
    expect(result.at(-1)).toBe(extendedStream.length);
  });
  it("remeasures for actual font/geometry changes, not a stale prefix", () => {
    expect(readerAppendedPagePrefix(prior, "resized", extendedChapters, extendedStream)).toBeUndefined();
  });
  it("rejects edited source text and headings even with the same chapter numbers", () => {
    const changed = structuredClone(extendedChapters);
    changed[0].headings = [{ beforeVerse: 1, text: "Changed heading" }];
    expect(readerAppendedPagePrefix(prior, prior.layoutKey, changed, extendedStream)).toBeUndefined();
    changed[0].headings = [];
    changed[0].verses[0].text = "new text";
    expect(readerAppendedPagePrefix(prior, prior.layoutKey, changed, extendedStream)).toBeUndefined();
  });
  it("rejects shifted windows, missing source units and incomplete measurements", () => {
    expect(readerAppendedPagePrefix(prior, prior.layoutKey, extendedChapters, extendedStream.slice(1))).toBeUndefined();
    expect(readerAppendedPagePrefix({ ...prior, splits: [0] }, prior.layoutKey, extendedChapters, extendedStream)).toBeUndefined();
    expect(readerAppendedPagePrefix(prior, prior.layoutKey, chapters, stream)).toBeUndefined();
  });
  it("does not freeze a partial first page", () => {
    expect(readerAppendedPagePrefix({ ...prior, splits: [0, stream.length] }, prior.layoutKey, extendedChapters, extendedStream)).toEqual([0]);
  });
});
