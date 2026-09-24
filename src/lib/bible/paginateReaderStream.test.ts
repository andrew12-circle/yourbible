import { describe, expect, it } from "vitest";
import { paginateReaderStream, readerPaginationPrefix } from "./paginateReaderStream";
import {
  buildReaderStream, isStreamSplitsReady, sliceReaderPage, sliceReaderSpreadPane,
  spreadPaneSplitsReady, ensureSpreadPageSplits,
  type ReaderChapterPassage, type ReaderStreamUnit,
} from "./readerStream";
import { fragmentReaderStream } from "./readerVerseFragments";
import { versePlainText } from "./verseParts";
import { validReaderPageBoundaries } from "./readerPageBoundaries";

const chapter: ReaderChapterPassage = { bookAbbr: "Gen", bookName: "Genesis", chapter: 4, verses: Array.from({ length: 26 }, (_, i) => ({ number: i + 1, text: `Synthetic verse ${i + 1}` })), paragraphStarts: [1], headings: [], poetryBlocks: [] };
const verseCount = (stream: ReaderStreamUnit[], start: number, end: number) => stream.slice(start, end).filter(unit => unit.kind === "verse").length;
function pages(stream: ReaderStreamUnit[], splits: number[]) {
  return splits.slice(0, -1).map((_, index) => sliceReaderPage(stream, splits, index)!);
}
function sourceCoverage(stream: ReaderStreamUnit[], splits: number[]) {
  const visited: number[] = [];
  for (let page = 0; page < splits.length - 1; page++) {
    for (let index = splits[page]; index < splits[page + 1]; index++) visited.push(index);
  }
  expect(visited).toEqual(stream.map((_, index) => index));
  expect(isStreamSplitsReady(splits, stream.length)).toBe(true);
  expect(pages(stream, splits).every(Boolean)).toBe(true);
}
function matthew(ch: number, start: number, end: number, artworkAt: number[]): ReaderStreamUnit[] {
  const units: ReaderStreamUnit[] = [];
  if (start === 1) units.push({ kind: "chapter-header", bookAbbr: "Mat", bookName: "Matthew", chapter: ch });
  for (let verse = start; verse <= end; verse++) {
    if (artworkAt.includes(verse)) units.push({ kind: "plate", bookAbbr: "Mat", bookName: "Matthew", chapter: ch,
      plate: { id: `mat-${ch}-${verse}`, bookAbbr: "Mat", chapter: ch, beforeVerse: verse, title: `Scene ${ch}:${verse}`, referenceLabel: `Matthew ${ch}:${verse}`, imageUrl: `/test-${ch}-${verse}.webp`, alt: "Test scene" } });
    units.push({ kind: "verse", bookAbbr: "Mat", bookName: "Matthew", chapter: ch,
      verse: { number: verse, text: `Synthetic Matthew ${ch}:${verse} text with exact spacing.  ` } });
  }
  return units;
}

describe("text-first illustrated pages", () => {
  it("covers every source unit once and keeps images off the Scripture pages", () => {
    const stream = buildReaderStream([chapter]);
    const original = JSON.stringify(stream);
    const splits = paginateReaderStream(stream, (start, end) => verseCount(stream, start, end) <= 5);
    sourceCoverage(stream, splits);
    for (const page of pages(stream, splits)) {
      if (page.isPlatePage) expect(page.verseGroups).toHaveLength(0);
      else expect(page.plates).toHaveLength(0);
    }
    expect(JSON.stringify(stream)).toBe(original);
  });
  it("fills past Matthew 26:68 and across the chapter instead of stopping for the denial picture", () => {
    const stream = [...matthew(26, 57, 75, [57, 69]), ...matthew(27, 1, 66, [2, 35])];
    const splits = paginateReaderStream(stream, (start, end) => verseCount(stream, start, end) <= 24);
    sourceCoverage(stream, splits);
    const textPages = pages(stream, splits).filter(page => !page.isPlatePage);
    expect(textPages[0].verseGroups[0].verses.map(verse => verse.number)).toEqual(Array.from({ length: 19 }, (_, i) => i + 57));
    expect(textPages[0].verseGroups[1].verses.map(verse => verse.number)).toEqual([1, 2, 3, 4, 5]);
    for (const page of textPages.slice(0, -1)) expect(page.verseGroups.flatMap(group => group.verses)).toHaveLength(24);
    const artwork = pages(stream, splits).filter(page => page.isPlatePage).flatMap(page => page.plates.map(plate => plate.id));
    expect(artwork).toEqual(["mat-26-57", "mat-26-69", "mat-27-2", "mat-27-35"]);
  });
  it("does not strand Matthew 27:1 on an almost-empty page", () => {
    const stream = matthew(27, 1, 66, [2, 35]);
    const splits = paginateReaderStream(stream, (start, end) => verseCount(stream, start, end) <= 12);
    sourceCoverage(stream, splits);
    expect(pages(stream, splits).find(page => !page.isPlatePage)!.verseGroups[0].verses.map(verse => verse.number)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(sliceReaderSpreadPane(stream, splits, 0, "left", stream.length)?.isPlatePage).toBe(true);
    expect(sliceReaderSpreadPane(stream, splits, 0, "right", stream.length)?.verseGroups[0].verses).toHaveLength(12);
    expect(spreadPaneSplitsReady(splits, 0, stream.length)).toBe(true);
    expect(ensureSpreadPageSplits(splits, stream)).toEqual(splits);
  });
  it("preserves every character through word-fragment cuts and chapter transitions", () => {
    const source = [...matthew(26, 69, 75, [69]), ...matthew(27, 1, 12, [2])];
    const stream = fragmentReaderStream(source);
    const splits = paginateReaderStream(stream, (start, end) => verseCount(stream, start, end) <= 17);
    sourceCoverage(stream, splits);
    const reconstructed = new Map<string, string>();
    for (const page of pages(stream, splits)) for (const group of page.verseGroups) for (const verse of group.verses) {
      const key = `${group.chapter}:${verse.number}`;
      reconstructed.set(key, (reconstructed.get(key) ?? "") + versePlainText(verse));
    }
    for (const unit of source) if (unit.kind === "verse") expect(reconstructed.get(`${unit.chapter}:${unit.verse.number}`)).toBe(unit.verse.text);
  });
  it("does not lose oversized verses or leave orphan chapter headings", () => {
    const stream = buildReaderStream([chapter]);
    const splits = paginateReaderStream(stream, () => false);
    sourceCoverage(stream, splits);
    for (const page of pages(stream, splits)) {
      if (!page.isPlatePage) expect(page.verseGroups.flatMap(group => group.verses).length).toBeGreaterThan(0);
    }
  });
  it("does not synthesize a page for an empty document", () => expect(paginateReaderStream([], () => true)).toEqual([0]));
  it("keeps illustration and text paired when remeasuring an unfinished prefix", () => {
    const stream = matthew(27, 1, 20, [8]);
    const original = paginateReaderStream(stream, (start, end) => verseCount(stream, start, end) <= 12);
    expect(original.slice(0, 2)).toEqual([0, 0]);
    const corrected = paginateReaderStream(stream, (start, end) => verseCount(stream, start, end) <= 4, original.slice(0, 2));
    sourceCoverage(stream, corrected);
    expect(pages(stream, corrected).filter(page => page.isPlatePage).flatMap(page => page.plates.map(plate => plate.id))).toEqual(["mat-27-8"]);
  });
  it("uses the actual text-page index when a companion precedes it", () => {
    const stream = matthew(27, 1, 20, [2]);
    const splits = paginateReaderStream(stream, (start, end, index) => verseCount(stream, start, end) <= (index === 0 ? 3 : 7));
    expect(pages(stream, splits)[1].verseGroups[0].verses).toHaveLength(7);
  });
});

describe("forward-only fit correction", () => {
  it("keeps completed read pages unchanged and puts the exact unread unit first", () => {
    const stream = buildReaderStream([chapter]);
    const original = paginateReaderStream(stream, (start, end) => verseCount(stream, start, end) <= 6);
    let page = Math.min(4, original.length - 2);
    if (page > 0 && original[page] === original[page - 1]) page--;
    const prefix = original.slice(0, page + 1);
    const corrected = paginateReaderStream(stream, (start, end, index) => {
      expect(start).toBeGreaterThanOrEqual(prefix.at(-1)!);
      expect(index).toBeGreaterThanOrEqual(page);
      return verseCount(stream, start, end) <= 3;
    }, prefix);
    expect(corrected.slice(0, page + 1)).toEqual(prefix);
    sourceCoverage(stream, corrected);
  });
  it("accepts one illustration cut but rejects malformed or incomplete plans", () => {
    expect(readerPaginationPrefix(30, [0, 0])).toEqual([0, 0]);
    expect(validReaderPageBoundaries([0, 0, 30], 30, true)).toBe(true);
    for (const prefix of [[1], [0, 0, 0], [0, 4, 2], [0, -1], [0, 1.5], [0, 31]]) expect(readerPaginationPrefix(30, prefix)).toEqual([0]);
    for (const splits of [[0], [0, 0], [0, 30, 30], [0, 0, 0, 30]]) expect(isStreamSplitsReady(splits, 30)).toBe(false);
  });
});

it("keeps a next-chapter header and artwork with their opening verse", () => {
  const stream = [...matthew(26, 72, 75, []), ...matthew(27, 1, 12, [1, 2])];
  const splits = paginateReaderStream(stream, (start, end) => verseCount(stream, start, end) <= 4);
  sourceCoverage(stream, splits);
  for (let page = 0; page < splits.length - 1; page++) {
    const units = stream.slice(splits[page], splits[page + 1]);
    if (units.length) expect(units.at(-1)?.kind).toBe("verse");
  }
});
