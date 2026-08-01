import { describe, expect, it } from "vitest";
import { findBundledVerseMatches } from "./bundledVerseSearch";

const rows: [string, number, number, string][] = [
  ["Jhn", 3, 16, "For God loved the world in this way."],
  ["Rom", 8, 1, "There is now no condemnation for those in Christ Jesus."],
  ["Jhn", 1, 1, "In the beginning was the Word."],
];

describe("findBundledVerseMatches", () => {
  it("matches every query term and preserves canonical order", () => {
    expect(findBundledVerseMatches(rows, "God world")).toMatchObject([
      { book: "Jhn", chapter: 3, verse: 16, reference: "John 3:16" },
    ]);
  });

  it("returns no result for one-character queries", () => {
    expect(findBundledVerseMatches(rows, "a")).toEqual([]);
  });

  it("honors the result limit", () => {
    expect(findBundledVerseMatches(rows, "the", 1)).toHaveLength(1);
  });
});
