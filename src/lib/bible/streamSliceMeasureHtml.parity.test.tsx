import { describe, expect, it } from "vitest";
import { buildStreamSliceMeasureHtml } from "./streamSliceMeasureHtml";
import type { ReaderChapterPassage, ReaderStreamUnit } from "./readerStream";
const chapter: ReaderChapterPassage = {
  bookAbbr: "Jhn", bookName: "John", chapter: 3,
  verses: [
    { number: 13, text: "Synthetic text.", parts: [{ kind: "text", text: "Synthetic text." }] },
    { number: 14, text: "More synthetic text.", parts: [{ kind: "text", text: "More synthetic text." }, { kind: "footnote", marker: 14, text: "A source note." }] },
  ],
  paragraphStarts: [1, 12], headings: [], poetryBlocks: [{ beforeVerse: 12, level: 2 }],
};
const stream: ReaderStreamUnit[] = chapter.verses.map(verse => ({ kind: "verse", bookAbbr: "Jhn", bookName: "John", chapter: 3, verse }));
describe("measurement uses the actual Scripture renderer", () => {
  it("measures the live button gutter, continuation poetry and note markers", () => {
    const node = document.createElement("div");
    node.innerHTML = buildStreamSliceMeasureHtml(stream, [chapter], new Map(), "holman");
    expect(node.querySelectorAll("button.verse-num.verse-num-gutter")).toHaveLength(2);
    expect(node.querySelector(".scripture-poetry.scripture-poetry-q2")).not.toBeNull();
    expect(node.querySelector("sup.scripture-footnote-mark")?.textContent).toBe("14");
    expect(node.querySelector('[data-verse-body="13"]')?.textContent).toBe("Synthetic text.");
    expect(node.querySelector('[data-verse-body="14"]')?.textContent).toBe("More synthetic text.14");
    expect(node.querySelector(".chapter-drop-cap")).toBeNull();
  });
  it("keeps ordinary verses, headings and drop caps in the same render path", () => {
    const first = { ...chapter, verses: [{ number: 1, text: "Opening synthetic text." }], paragraphStarts: [1], poetryBlocks: [], headings: [{ beforeVerse: 1, text: "An opening heading" }] };
    const units: ReaderStreamUnit[] = [{ kind: "verse", bookAbbr: "Jhn", bookName: "John", chapter: 3, verse: first.verses[0] }];
    const node = document.createElement("div");
    node.innerHTML = buildStreamSliceMeasureHtml(units, [first], new Map(), "inline");
    expect(node.querySelector(".scripture-heading")?.textContent).toBe("An opening heading");
    expect(node.querySelector(".chapter-drop-cap")?.textContent).toBe("3");
    expect(node.querySelector('[data-verse-body="1"]')?.textContent).toBe("Opening synthetic text.");
  });
});
