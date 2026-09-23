import { describe, expect, it } from "vitest";
import { readerRunningHead } from "./readerRunningHead";
const chapter = (n: number) => ({ bookAbbr: "Pro", bookName: "Proverbs", chapter: n });
const page = (...chapters: ReturnType<typeof chapter>[]) => ({ verseGroups: chapters, primaryChapter: chapters[0] ?? null });
describe("per-page running chapter range", () => {
  it("uses the full range on the physical page, not a dominant or route chapter", () => {
    expect(readerRunningHead(page(chapter(3), chapter(4)), chapter(20))).toBe("Proverbs 3–4");
    expect(readerRunningHead(page(chapter(4), chapter(5)), chapter(3))).toBe("Proverbs 4–5");
  });
  it("does not duplicate the same chapter", () => {
    expect(readerRunningHead(page(chapter(4), chapter(4)), chapter(20))).toBe("Proverbs 4");
  });
  it("includes the book names when a page crosses books", () => {
    expect(readerRunningHead(page(chapter(31), { bookAbbr: "Ecc", bookName: "Ecclesiastes", chapter: 1 }), chapter(3))).toBe("Proverbs 31–Ecclesiastes 1");
  });
  it("labels an illustration-only page from its own primary chapter", () => {
    expect(readerRunningHead({ verseGroups: [], primaryChapter: chapter(8) }, chapter(3))).toBe("Proverbs 8");
  });
  it("supports the current chapter in single-chapter and scroll readers", () => {
    expect(readerRunningHead(null, chapter(5))).toBe("Proverbs 5");
  });
});
