import { describe, expect, it } from "vitest";
import { buildReaderStream, type ReaderChapterPassage } from "./readerStream";
import { fragmentReaderStream } from "./readerVerseFragments";
import { ReaderPageHistory, readerPageHistoryForRoot, type ReaderPageHistoryEntry } from "./readerPageHistory";

const chapter = (number: number): ReaderChapterPassage => ({ bookAbbr: "Test", bookName: "Test", chapter: number,
  verses: [{ number: 1, text: "one two three four five six seven eight nine ten" }],
  paragraphStarts: [1], headings: [], poetryBlocks: [] });
const entry = (n = 6): ReaderPageHistoryEntry => {
  const chapters = [chapter(n), chapter(n + 1)];
  const stream = fragmentReaderStream(buildReaderStream(chapters));
  return { geometryKey: "525x731|serif|double|v22", footerHeight: 28, chapters, stream, splits: [0, 5, 12, stream.length] };
};

describe("exact printed page history", () => {
  it("survives hidden paginator remounts without sharing history with a different visible reader", () => {
    const root = document.createElement("div"), other = document.createElement("div"), first = entry();
    readerPageHistoryForRoot(root).remember(first);
    expect(readerPageHistoryForRoot(root).find(first.geometryKey, 12, first.chapters, first.stream)).toEqual(first.splits);
    expect(readerPageHistoryForRoot(other).find(first.geometryKey, 12, first.chapters, first.stream)).toBeUndefined();
  });
  it("restores corrected page cuts after leaving and returning to a chapter window", () => {
    const history = new ReaderPageHistory(), first = entry();
    history.remember(first); history.remember(entry(23));
    expect(history.find(first.geometryKey, 12, structuredClone(first.chapters), structuredClone(first.stream))).toEqual(first.splits);
  });
  it("does not use less conservative cuts after a new overflow correction", () => {
    const history = new ReaderPageHistory(), first = entry(); history.remember(first);
    expect(history.find(first.geometryKey, 44, first.chapters, first.stream)).toBeUndefined();
    expect(history.find(first.geometryKey, 12, first.chapters, first.stream, [0, 4])).toBeUndefined();
  });
  it("rejects real font/viewport/source changes and shifted word ranges", () => {
    const history = new ReaderPageHistory(), first = entry(); history.remember(first);
    expect(history.find("resized", 12, first.chapters, first.stream)).toBeUndefined();
    const chapters = structuredClone(first.chapters); chapters[0].verses[0].text = "different but still Scripture source";
    expect(history.find(first.geometryKey, 12, chapters, first.stream)).toBeUndefined();
    const stream = structuredClone(first.stream), word = stream.find(unit => unit.kind === "verse")!;
    if (word.kind === "verse" && word.verseRange) word.verseRange.end++;
    expect(history.find(first.geometryKey, 12, first.chapters, stream)).toBeUndefined();
  });
  it("does not evict the completed window while its shorter loading prefix arrives", () => {
    const history = new ReaderPageHistory(), first = entry(); history.remember(first);
    const chapters = first.chapters.slice(0, 1), stream = fragmentReaderStream(buildReaderStream(chapters));
    history.remember({ ...first, footerHeight: 12, chapters, stream, splits: [0, stream.length] });
    expect(history.find(first.geometryKey, 12, first.chapters, first.stream)).toEqual(first.splits);
  });
  it("replaces the same window on valid append and never lends cuts to a shorter window", () => {
    const history = new ReaderPageHistory(), first = entry(); history.remember(first);
    const chapters = [...first.chapters, chapter(8)], stream = fragmentReaderStream(buildReaderStream(chapters));
    const next = { ...first, chapters, stream, splits: [0, 5, 12, first.stream.length, stream.length] }; history.remember(next);
    expect(history.find(next.geometryKey, 12, chapters, stream)).toEqual(next.splits);
    expect(history.find(first.geometryKey, 12, first.chapters, first.stream)).toBeUndefined();
  });
  it("bounds memory and returns independent page arrays", () => {
    const history = new ReaderPageHistory(2), first = entry(), second = entry(9), third = entry(23);
    history.remember(first); history.remember(second); history.remember(third);
    expect(history.find(first.geometryKey, 12, first.chapters, first.stream)).toBeUndefined();
    const result = history.find(second.geometryKey, 12, second.chapters, second.stream)!; result[1] = 999;
    expect(history.find(second.geometryKey, 12, second.chapters, second.stream)).toEqual(second.splits);
  });
  it("rejects in-place edits instead of validating against mutable source references", () => {
    const history = new ReaderPageHistory(), first = entry(); history.remember(first);
    first.chapters[0].verses[0].text = "edited in place";
    expect(history.find(first.geometryKey, 12, first.chapters, first.stream)).toBeUndefined();
  });
  it("does not cache provisional or malformed measurements", () => {
    const history = new ReaderPageHistory(), first = entry(); history.remember({ ...first, splits: [0] });
    expect(history.find(first.geometryKey, 12, first.chapters, first.stream)).toBeUndefined();
  });
});
