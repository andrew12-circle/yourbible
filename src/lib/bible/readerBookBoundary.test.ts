import { describe, expect, it } from "vitest";
import { BOOKS } from "@/data/books";
import { readerBookNeighbors } from "./readerBookBoundary";
import { continuationChapterRefs, continuationCountThrough } from "./readerContinuation";
import { getNextChapterRef, getPrevChapterRef } from "./chapterNav";
import { buildAdjacentStreamChapters } from "./readerStreamChapters";
import { buildReaderStream, type ReaderChapterPassage } from "./readerStream";
import { readReaderWindowFlow, readerWindowStream, readerWindowTurn } from "./readerWindowFlow";

const passage = { reference: "Test", verses: [{ number: 1, text: "Exact fixture words." }], paragraphStarts: [1], headings: [] };
const chapter = (bookAbbr: string, chapter: number): ReaderChapterPassage => ({ ...passage, bookAbbr, bookName: bookAbbr, chapter, poetryBlocks: [] });
const stream = buildReaderStream([chapter("Mat", 27), chapter("Mat", 28)], { plateFocus: { bookAbbr: "NONE", chapter: 0 } });
const options = { bibleId: "fixture", bookAbbr: "Mat", chapter: 27, stream,
  splits: [0, 1, 2, 3, 4], page: 0, pagesPerTurn: 2, delta: 1, firstPageNumber: 100 };

describe("a biblical book ends before the next book opens", () => {
  it("keeps chapter read-ahead within each of the 66 books", () => {
    for (const book of BOOKS) {
      expect(readerBookNeighbors(book.abbr, 1).prev).toBeNull();
      expect(readerBookNeighbors(book.abbr, book.chapters).next).toBeNull();
      expect(continuationChapterRefs({ bookAbbr: book.abbr, chapter: book.chapters }, 16)).toEqual([]);
      if (book.chapters > 1) {
        expect(readerBookNeighbors(book.abbr, 1).next?.chapter).toBe(2);
        expect(continuationChapterRefs({ bookAbbr: book.abbr, chapter: book.chapters - 1 }, 16).map(r => r.chapter)).toEqual([book.chapters]);
      }
    }
  });
  it("still fills chapters within a book, but ignores an old cross-book read-ahead extent", () => {
    expect(continuationChapterRefs({ bookAbbr: "Mat", chapter: 26 }, 16).map(r => r.chapter)).toEqual([27, 28]);
    expect(continuationCountThrough({ bookAbbr: "Mat", chapter: 26 }, { bookAbbr: "Mrk", chapter: 1 })).toBe(0);
  });
  it("does not include a cached next or previous book in adjacent Scripture", () => {
    const last = buildAdjacentStreamChapters(getPrevChapterRef("Mat", 28), passage, "Mat", "Matthew", 28, passage, getNextChapterRef("Mat", 28), passage);
    expect(last.map(c => `${c.bookAbbr}:${c.chapter}`)).toEqual(["Mat:27", "Mat:28"]);
    const first = buildAdjacentStreamChapters(getPrevChapterRef("Mrk", 1), passage, "Mrk", "Mark", 1, passage, getNextChapterRef("Mrk", 1), passage);
    expect(first.map(c => `${c.bookAbbr}:${c.chapter}`)).toEqual(["Mrk:1", "Mrk:2"]);
  });
  it("shows the final unread spread before opening the next book", () => {
    expect(readerWindowTurn(options)).toBeNull();
    const turn = readerWindowTurn({ ...options, page: 2 })!;
    expect(turn.bookAbbr).toBe("Mrk");
    expect(turn.chapter).toBe(1);
    expect(turn.flow.startId).toBe("Mrk|1|start");
    expect(turn.flow.firstPageNumber).toBe(104);
    expect(turn.flow.back?.restoreId).toBe("Mat|28|heading");
  });
  it("leaves the unused facing page blank instead of putting the next book there", () => {
    const cuts = [0, 1, 2, 4];
    expect(readerWindowTurn({ ...options, splits: cuts })).toBeNull();
    expect(readerWindowTurn({ ...options, splits: cuts, page: 2 })?.flow.firstPageNumber).toBe(104);
  });
  it("restores the final prior-book spread after turning backward from the opening", () => {
    const forward = readerWindowTurn({ ...options, page: 2 })!;
    const next = buildReaderStream([chapter("Mrk", 1)], { plateFocus: { bookAbbr: "NONE", chapter: 0 } });
    const back = readerWindowTurn({ ...options, stream: next, splits: [0, 2], bookAbbr: "Mrk", chapter: 1, page: 0, delta: -1, flow: forward.flow })!;
    expect(back.bookAbbr).toBe("Mat");
    expect(back.flow.restoreId).toBe("Mat|28|heading");
  });
  it("can go back from a directly opened book without waiting for a foreign end marker", () => {
    const next = buildReaderStream([chapter("Mrk", 1)], { plateFocus: { bookAbbr: "NONE", chapter: 0 } });
    const back = readerWindowTurn({ ...options, stream: next, splits: [0, 2], bookAbbr: "Mrk", chapter: 1, page: 0, delta: -1 })!;
    expect(back.bookAbbr).toBe("Mat");
    expect(back.enterAtEnd).toBe(true);
    expect(back.flow.endId).toBeUndefined();
    expect(readerWindowStream(stream, back.flow)).toEqual(stream);
  });
  it("drops obsolete foreign-book cuts while keeping valid history object identity", () => {
    const flow = { bibleId: "fixture", bookAbbr: "Mrk", chapter: 1, firstPageNumber: 104, startId: "Mrk|1|start" };
    expect(readReaderWindowFlow({ readerWindowFlow: flow }, "fixture", "Mrk", 1)).toBe(flow);
    const stale = { ...flow, endId: "Luk|1|heading", through: { bookAbbr: "Luk", chapter: 1 } };
    const repaired = readReaderWindowFlow({ readerWindowFlow: stale }, "fixture", "Mrk", 1)!;
    expect(repaired.endId).toBeUndefined();
    expect(repaired.through).toBeUndefined();
    expect(readReaderWindowFlow({ readerWindowFlow: { ...flow, startId: "Mat|28|v20" } }, "fixture", "Mrk", 1)).toBeUndefined();
  });
});
