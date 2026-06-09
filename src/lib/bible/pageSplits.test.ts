import { describe, expect, it } from "vitest";
import type { PassageVerse } from "@/lib/bible/api";
import {
  areSameSplits,
  isPageSplitsReady,
  pageCountFromSplits,
  pageVerseSlice,
} from "@/lib/bible/pageSplits";

const verses: PassageVerse[] = [
  { number: 1, text: "a" },
  { number: 2, text: "b" },
  { number: 3, text: "c" },
  { number: 4, text: "d" },
];

describe("pageSplits", () => {
  it("compares split arrays by value", () => {
    expect(areSameSplits([0, 2, 4], [0, 2, 4])).toBe(true);
    expect(areSameSplits([0, 2, 4], [0, 2, 3])).toBe(false);
    expect(areSameSplits([0], [0, 4])).toBe(false);
  });

  it("detects incomplete splits", () => {
    expect(isPageSplitsReady([0], verses.length)).toBe(false);
    expect(isPageSplitsReady([0, 4], verses.length)).toBe(true);
  });

  it("rejects non-monotonic or partial coverage", () => {
    expect(isPageSplitsReady([0, 2, 2, 4], verses.length)).toBe(false);
    expect(isPageSplitsReady([0, 2], verses.length)).toBe(false);
  });

  it("returns null slices until splits are ready", () => {
    expect(pageVerseSlice([0], 0, verses)).toBeNull();
    expect(pageVerseSlice([0], 1, verses)).toBeNull();
  });

  it("maps sequential pages without duplicating content", () => {
    const splits = [0, 2, 4];
    expect(pageVerseSlice(splits, 0, verses)?.map((v) => v.number)).toEqual([1, 2]);
    expect(pageVerseSlice(splits, 1, verses)?.map((v) => v.number)).toEqual([3, 4]);
    expect(pageCountFromSplits(splits, verses.length)).toBe(2);
  });
});
