import { describe, expect, it } from "vitest";
import { paginateReaderStream } from "./paginateReaderStream";
import { buildReaderStream, type ReaderChapterPassage } from "./readerStream";
const chapter: ReaderChapterPassage = { bookAbbr: "Gen", bookName: "Genesis", chapter: 4, verses: Array.from({ length: 26 }, (_, i) => ({ number: i + 1, text: `Synthetic verse ${i + 1}` })), paragraphStarts: [1], headings: [], poetryBlocks: [] };
describe("deterministic artwork page boundaries", () => {
  it("includes every unit exactly once and never measures an image as text", () => {
    const stream = buildReaderStream([chapter]);
    const splits = paginateReaderStream(stream, (start, end) => {
      expect(stream.slice(start, end).some((unit) => unit.kind === "plate")).toBe(false);
      return end - start <= 5;
    });
    const visited: number[] = [];
    for (let page = 0; page < splits.length - 1; page++) {
      const start = splits[page], end = splits[page + 1];
      const slice = stream.slice(start, end);
      if (slice.some((unit) => unit.kind === "plate")) expect(slice).toHaveLength(1);
      for (let index = start; index < end; index++) visited.push(index);
    }
    expect(visited).toEqual(stream.map((_, index) => index));
  });
  it("does not lose a verse too tall to fit or leave an orphan chapter header", () => {
    const stream = buildReaderStream([chapter]);
    const splits = paginateReaderStream(stream, () => false);
    for (let page = 0; page < splits.length - 1; page++) {
      const slice = stream.slice(splits[page], splits[page + 1]);
      if (slice[0].kind === "chapter-header") expect(slice.some((unit) => unit.kind === "verse")).toBe(true);
    }
    expect(splits.at(-1)).toBe(stream.length);
  });
  it("does not synthesize a page for an empty document", () => expect(paginateReaderStream([], () => true)).toEqual([0]));
});
