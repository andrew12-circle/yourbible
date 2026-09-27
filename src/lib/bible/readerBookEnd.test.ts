import { describe, expect, it } from "vitest";
import { readerPageEndsBook, readerStreamEndsBook } from "./readerBookEnd";
import { buildReaderStream, type ReaderChapterPassage } from "./readerStream";
import { sliceReaderVerse } from "./readerVerseFragments";
import { scriptureColumnWrapperStyle, applyScriptureColumnMeasureHtml, applyHolmanStudyMeasureHtml } from "./readerColumnMeasure";

const last = { number: 53, text: "They continued praising God." };
const chapter: ReaderChapterPassage = { bookAbbr: "Luk", bookName: "Luke", chapter: 24,
  verses: [{ number: 52, text: "They returned with great joy." }, last],
  paragraphStarts: [52], headings: [], poetryBlocks: [] };
const group = { bookAbbr: "Luk", chapter: 24, verses: chapter.verses };

describe("balanced final physical page", () => {
  it("balances only the end of a complete book, not each chapter or loading window", () => {
    expect(readerPageEndsBook([group], [chapter])).toBe(true);
    expect(readerPageEndsBook([{ ...group, chapter: 23 }], [{ ...chapter, chapter: 23 }])).toBe(false);
    expect(readerPageEndsBook([{ ...group, verses: [chapter.verses[0]] }], [chapter])).toBe(false);
    expect(readerPageEndsBook([group], [])).toBe(false);
    expect(readerPageEndsBook([], [chapter])).toBe(false);
  });
  it("does not balance a clipped first fragment of the final verse", () => {
    expect(readerPageEndsBook([{ ...group, verses: [sliceReaderVerse(last, 0, 10)] }], [chapter])).toBe(false);
    expect(readerPageEndsBook([{ ...group, verses: [sliceReaderVerse(last, 10, last.text.length)] }], [chapter])).toBe(true);
  });
  it("requires the same source text, rather than just matching a verse number", () => {
    expect(readerPageEndsBook([{ ...group, verses: [{ ...last, text: "Old incomplete words" }] }], [chapter])).toBe(false);
  });
  it("agrees in hidden stream measurement, including split verses", () => {
    const stream = buildReaderStream([chapter], { plateFocus: { bookAbbr: "NONE", chapter: 0 } });
    expect(readerStreamEndsBook(stream, [chapter])).toBe(true);
    expect(readerStreamEndsBook(stream.slice(0, -1), [chapter])).toBe(false);
    const end = stream.at(-1)!;
    if (end.kind !== "verse") throw new Error("Test requires a verse");
    expect(readerStreamEndsBook([{ ...end, verseRange: { start: 0, end: 10 } }], [chapter])).toBe(false);
    expect(readerStreamEndsBook([{ ...end, verseRange: { start: 10, end: last.text.length } }], [chapter])).toBe(true);
  });
  it("works for one-chapter books and the end of Revelation without an invented following book", () => {
    for (const [bookAbbr, number] of [["Jud", 1], ["Rev", 22]] as const) {
      const ch = { ...chapter, bookAbbr, chapter: number };
      expect(readerPageEndsBook([ch], [ch])).toBe(true);
    }
  });
  it("keeps the fixed page height and changes only the column distribution", () => {
    const normal = scriptureColumnWrapperStyle(600);
    const balanced = scriptureColumnWrapperStyle(600, true);
    expect(normal.columnFill).toBe("auto");
    expect(balanced).toEqual({ ...normal, columnFill: "balance", WebkitColumnFill: "balance" });
    expect(balanced.height).toBe(600);
    const node = document.createElement("div");
    applyScriptureColumnMeasureHtml(node, "<p>Source text</p>", "scripture-columns-2", 604, { balanceColumns: true });
    expect(node.firstElementChild?.getAttribute("style")).toContain("column-fill:balance");
    applyHolmanStudyMeasureHtml(node, "<p>Source text</p>", "", "", "scripture-columns-2", 604, { balanceColumns: true });
    expect(node.querySelector(".scripture-columns-2")?.getAttribute("style")).toContain("column-fill:balance");
  });
});
