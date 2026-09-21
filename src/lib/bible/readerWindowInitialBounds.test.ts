import { describe, expect, it } from "vitest";
import { fragmentReaderStream } from "./readerVerseFragments";
import { readerStreamUnitId, readerWindowStream, readerWindowTurn } from "./readerWindowFlow";
import type { ReaderStreamUnit } from "./readerStream";

const chapter = (number: number): ReaderStreamUnit[] => [
  {kind: "chapter-header", bookAbbr: "Act", bookName: "Acts", chapter: number},
  {kind: "verse", bookAbbr: "Act", bookName: "Acts", chapter: number, verse: {number: 1, text: "Every original word must stay in its place."}},
];

describe("restoring the initial printed-page window", () => {
  it("does not prepend a cached previous chapter when turning back", () => {
    const initial = fragmentReaderStream([...chapter(6), ...chapter(7)]);
    const splits = [0, 4, 8, 12, initial.length];
    const turn = readerWindowTurn({bibleId: "csb", bookAbbr: "Act", chapter: 6, stream: initial, splits, page: 0, pagesPerTurn: 2, delta: 1, firstPageNumber: 1356});
    expect(turn).not.toBeNull();
    expect(turn!.flow.back!.startId).toBe(readerStreamUnitId(initial[0]));
    const rebuilt = fragmentReaderStream([...chapter(5), ...chapter(6), ...chapter(7)]);
    expect(readerWindowStream(rebuilt, turn!.flow.back).map(readerStreamUnitId)).toEqual(initial.map(readerStreamUnitId));
  });
  it("retains an explicit mid-verse start rather than replacing it with the chapter opener", () => {
    const stream = fragmentReaderStream([...chapter(6), ...chapter(7)]).slice(3);
    const startId = readerStreamUnitId(stream[0]);
    const turn = readerWindowTurn({bibleId: "csb", bookAbbr: "Act", chapter: 6, stream, splits: [0, 4, 8, stream.length], page: 0, pagesPerTurn: 2, delta: 1, firstPageNumber: 1356,
      flow: {bibleId: "csb", bookAbbr: "Act", chapter: 6, firstPageNumber: 1356, startId}});
    expect(turn!.flow.back!.startId).toBe(startId);
    expect(startId).toContain("@");
  });
});
