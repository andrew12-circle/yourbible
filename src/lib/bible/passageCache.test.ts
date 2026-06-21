import { describe, expect, it } from "vitest";
import { adjacentChapterRefs } from "@/lib/bible/adjacentChapters";
import { passageCacheKey } from "@/lib/bible/passageCache";

describe("passageCacheKey", () => {
  it("combines bibleId, book, and chapter", () => {
    expect(passageCacheKey("abc", "Jhn", 3)).toBe("abc|Jhn|3|v8");
  });
});

describe("adjacentChapterRefs", () => {
  it("returns prev and next in the same book", () => {
    expect(adjacentChapterRefs("Jhn", 3)).toEqual([
      { book: "Jhn", chapter: 2 },
      { book: "Jhn", chapter: 4 },
    ]);
  });

  it("crosses book boundary at chapter 1", () => {
    const refs = adjacentChapterRefs("Mat", 1);
    expect(refs).toContainEqual({ book: "Mal", chapter: 4 });
    expect(refs).toContainEqual({ book: "Mat", chapter: 2 });
  });
});
