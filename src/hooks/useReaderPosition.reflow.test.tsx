import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useReaderPosition } from "./useReaderPosition";
import { identifyReaderPassage } from "@/lib/bible/readerPassageIdentity";
import { BOOKS } from "@/data/books";
const verses = Array.from({ length: 12 }, (_, i) => ({ number: i + 1, text: `Synthetic verse ${i + 1}.` }));
describe("repeated reflow and exact reference identity", () => {
  it("does not drift backwards after changing font size twice", () => {
    const base = { bibleId: "fixture", bookAbbr: "Jhn", chapter: 3, verses, stream: [], useStream: false, ready: true, spread: false, splits: [0, 4, 8, 12], layoutKey: "one" };
    const { result, rerender } = renderHook((options) => useReaderPosition(options), { initialProps: base });
    act(() => result.current.setPage(1));
    rerender({ ...base, splits: [0, 3, 6, 9, 12], layoutKey: "two" });
    expect(result.current.anchor?.verse).toBe(5);
    rerender(base);
    expect(result.current.page).toBe(1);
    expect(result.current.anchor?.verse).toBe(5);
  });
  it("accepts every canonical full name and stable abbreviation", () => {
    for (const book of BOOKS) for (const name of [book.name, book.abbr]) {
      const p = { reference: `${name} 1`, verses, paragraphStarts: [1], headings: [] };
      expect(identifyReaderPassage(p, "fixture", book.abbr, 1).readerIdentity.bookAbbr).toBe(book.abbr);
    }
    expect(identifyReaderPassage({ reference: "Song of Songs 1", verses, paragraphStarts: [1], headings: [] }, "fixture", "Sng", 1).readerIdentity.chapter).toBe(1);
  });
  it("does not accept an unrecognized book merely sharing the first three letters", () => {
    expect(() => identifyReaderPassage({ reference: "Johnotabook 3", verses, paragraphStarts: [1], headings: [] }, "fixture", "Jhn", 3)).toThrow(/reference/);
  });
});
