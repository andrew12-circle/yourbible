import { describe, expect, it } from "vitest";
import { continuationChapterRefs, continuationCountThrough, MAX_READER_CONTINUATION_CHAPTERS, readerNeedsContinuation } from "./readerContinuation";
import { buildReaderStream, type ReaderChapterPassage } from "./readerStream";
import { readerWindowTurn, readerWindowStream } from "./readerWindowFlow";

describe("short-chapter read-ahead", () => {
  it("requests more text when the current or next facing spread ends at the loaded boundary", () => {
    expect(readerNeedsContinuation([0, 100, 130], 130, 0, 2)).toBe(true);
    expect(readerNeedsContinuation([0, 10, 20, 30, 40, 50], 50, 0, 2)).toBe(false);
    expect(readerNeedsContinuation([0, 10, 20, 30, 40, 50], 50, 2, 2)).toBe(true);
    expect(readerNeedsContinuation([0], 130, 0, 2)).toBe(false);
  });
  it("continues Psalms in order and crosses book boundaries without fetching the whole book", () => {
    expect(continuationChapterRefs({ bookAbbr: "Psa", chapter: 7 }, 3).map(ref => ref.chapter)).toEqual([8, 9, 10]);
    expect(continuationChapterRefs({ bookAbbr: "Psa", chapter: 150 }, 1)[0].book.abbr).toBe("Pro");
    expect(continuationChapterRefs({ bookAbbr: "Rev", chapter: 22 }, 8)).toEqual([]);
    expect(continuationChapterRefs({ bookAbbr: "Psa", chapter: 7 }, 1000)).toHaveLength(MAX_READER_CONTINUATION_CHAPTERS);
  });
  it("restores the loaded extent without losing earlier words when short chapters share a spread", () => {
    expect(continuationCountThrough({ bookAbbr: "Psa", chapter: 7 }, { bookAbbr: "Psa", chapter: 11 })).toBe(4);
    const chapters: ReaderChapterPassage[] = Array.from({ length: 7 }, (_, i) => ({ bookAbbr: "Psa", bookName: "Psalms", chapter: i + 6, verses: [{ number: 1, text: `Chapter ${i + 6}.` }], paragraphStarts: [1], headings: [], poetryBlocks: [] }));
    const stream = buildReaderStream(chapters, { plateFocus: { bookAbbr: "none", chapter: 0 } });
    const turn = readerWindowTurn({ bibleId: "test", bookAbbr: "Psa", chapter: 6, stream, splits: [0, 3, 6, 10, 14], page: 0, pagesPerTurn: 2, delta: 1, firstPageNumber: 640 })!;
    expect(turn.chapter).toBe(10); // unread starts in 9, not near the old edge of 12
    expect(turn.flow.back!.through).toEqual({ bookAbbr: "Psa", chapter: 12 });
    const rebuilt = buildReaderStream(chapters.slice(3), { plateFocus: { bookAbbr: "none", chapter: 0 } });
    expect(readerWindowStream(rebuilt, turn.flow)[0].chapter).toBe(9);
  });
});
