import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BOOKS } from "@/data/books";
import { ReaderBookOpening } from "./ReaderBookOpening";
import { renderScriptureParagraphNodes } from "@/lib/bible/readerScriptureRender";
import { buildStreamSliceMeasureHtml } from "@/lib/bible/streamSliceMeasureHtml";
import { buildReaderStream, type ReaderChapterPassage } from "@/lib/bible/readerStream";
import { createReaderVerseRenderer } from "@/lib/bible/readerVerseNode";
import { sliceReaderVerse } from "@/lib/bible/readerVerseFragments";

const verse = { number: 1, text: "An exact verse for the offline opening test." };
const ch: ReaderChapterPassage = { bookAbbr: "Mrk", bookName: "Mark", chapter: 1, verses: [verse], paragraphStarts: [1], headings: [{ beforeVerse: 1, text: "First section" }], poetryBlocks: [] };
const renderVerse = createReaderVerseRenderer({ bibleId: "measure", bookAbbr: "Mrk", chapter: 1, useBookSpread: true, studyLayout: "inline", redSegments: new Map(), redSegmentsByChapter: new Map(), ulFor: () => undefined, hlsFor: () => [], noteFor: () => undefined, onVerseNumberClick: () => {}, navigate: () => {}, setNoteOpen: () => {} });
function root(html: string) { const element = document.createElement("div"); element.innerHTML = html; return element; }
function render(chapter = ch, showBookOpening = true) {
  return renderToStaticMarkup(renderScriptureParagraphNodes([chapter], () => new Set(chapter.paragraphStarts), () => new Map(chapter.headings.map(h => [h.beforeVerse, h.text])), renderVerse, () => chapter.poetryBlocks, { showBookOpening }));
}
describe("printed book opening", () => {
  it("supplies a title and local introduction for every standard book without a query", () => {
    for (const book of BOOKS) {
      const page = root(renderToStaticMarkup(<ReaderBookOpening bookAbbr={book.abbr} />));
      expect(page.querySelector("h2")?.textContent).toBe(book.name);
      expect(page.querySelector(".reader-book-opening-summary")?.textContent?.length).toBeGreaterThan(30);
      expect(page.querySelector("[data-verse-id]" )).toBeNull();
    }
  });
  it("places MARK and its introduction before chapter one, outside the Scripture character stream", () => {
    const page = root(render());
    expect(page.firstElementChild?.getAttribute("data-reader-book-opening")).toBe("Mrk");
    expect(page.querySelectorAll("[data-reader-book-opening]")).toHaveLength(1);
    expect(page.querySelector("[data-verse-body]")?.textContent).toBe(verse.text);
    expect(page.querySelector(".reader-book-opening-kicker")?.textContent).toBe("The Gospel according to");
  });
  it("measures exactly the opening and Scripture markup that the reader displays", () => {
    const stream = buildReaderStream([ch], { plateFocus: { bookAbbr: "NONE", chapter: 0 } });
    expect(buildStreamSliceMeasureHtml(stream, [ch], new Map(), "inline")).toBe(render());
  });
  it("does not repeat the opening on later fragments, verses, chapters, or scroll's own introduction", () => {
    expect(root(render({ ...ch, verses: [sliceReaderVerse(verse, 9, verse.text.length)] })).querySelector("[data-reader-book-opening]")).toBeNull();
    expect(root(render({ ...ch, verses: [{ ...verse, number: 2 }] })).querySelector("[data-reader-book-opening]")).toBeNull();
    expect(root(render({ ...ch, chapter: 2 })).querySelector("[data-reader-book-opening]")).toBeNull();
    expect(root(render(ch, false)).querySelector("[data-reader-book-opening]")).toBeNull();
  });
});
