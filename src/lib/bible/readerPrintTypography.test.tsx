import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { Fragment } from "react";
import { renderScriptureParagraphNodes } from "./readerScriptureRender";
import { createReaderVerseRenderer } from "./readerVerseNode";
import { buildStreamSliceMeasureHtml } from "./streamSliceMeasureHtml";
import { buildReaderStream, type ReaderChapterPassage } from "./readerStream";
import { pageTypoClass } from "./fontChoices";
import { sliceReaderVerse } from "./readerVerseFragments";
import { versePlainText } from "./verseParts";
import { offsetInVerseBody } from "./verseSelection";
import type { PassageVerse } from "./api";

const verse = (number: number, text = `Verse ${number} keeps all its words.`): PassageVerse => ({ number, text });
const chapter = (values: Partial<ReaderChapterPassage> = {}): ReaderChapterPassage => ({
  bookAbbr: "Pro", bookName: "Proverbs", chapter: 4,
  verses: [verse(2), verse(3), verse(4)], paragraphStarts: [2], headings: [], poetryBlocks: [], ...values,
});
const numberClick = vi.fn();
const renderer = () => createReaderVerseRenderer({
  bibleId: "test", bookAbbr: "Pro", chapter: 4, useBookSpread: true, studyLayout: "inline",
  redSegments: new Map(), redSegmentsByChapter: new Map(),
  ulFor: () => undefined, hlsFor: () => [], noteFor: () => undefined,
  onVerseNumberClick: numberClick, navigate: vi.fn(), setNoteOpen: vi.fn(),
});
const nodes = (ch: ReaderChapterPassage) => renderScriptureParagraphNodes(
  [ch], () => new Set(ch.paragraphStarts), () => new Map(ch.headings.map(h => [h.beforeVerse, h.text])),
  renderer(), () => ch.poetryBlocks,
);
afterEach(() => { cleanup(); numberClick.mockClear(); });

describe("print Bible paragraph and verse-number typesetting", () => {
  it("uses the same print typography class for every reader font", () => {
    for (const font of ["serif", "sans", "sf"]) expect(pageTypoClass(font)).toContain("reader-print-text");
  });
  it("keeps prose in publisher paragraphs rather than turning every verse into a row", () => {
    const { container } = render(<>{nodes(chapter())}</>);
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelectorAll(".scripture-verse-paragraph-start")).toHaveLength(1);
    expect(container.querySelector(".scripture-verse-paragraph-start")?.getAttribute("data-verse")).toBe("2");
    expect(container.querySelectorAll(".verse-num")).toHaveLength(3);
  });
  it("aligns poetry verse numbers in a gutter and retains publisher indentation levels", () => {
    const ch = chapter({ poetryBlocks: [{ beforeVerse: 2, level: 1 }, { beforeVerse: 3, level: 2 }, { beforeVerse: 4, level: 3 }] });
    const { container } = render(<>{nodes(ch)}</>);
    expect(container.querySelectorAll(".scripture-poetry")).toHaveLength(3);
    for (const [index, p] of [...container.querySelectorAll("p")].entries()) {
      expect(p.className).toContain(`scripture-poetry-q${index + 1}`);
      expect(p.querySelector(".scripture-verse-paragraph-start .verse-num")).not.toBeNull();
    }
  });
  it("honors a publisher section heading even when paragraphStarts omits it", () => {
    const { container } = render(<>{nodes(chapter({ headings: [{ beforeVerse: 3, text: "A Father’s Example" }] }))}</>);
    expect(container.querySelectorAll(".scripture-paragraph")).toHaveLength(2);
    const heading = container.querySelector(".scripture-heading")!;
    expect(heading.textContent).toBe("A Father’s Example");
    expect(heading.nextElementSibling?.querySelector("[data-verse]")?.getAttribute("data-verse")).toBe("3");
  });
  it("does not duplicate the chapter or verse number when a verse crosses a page", () => {
    const source = verse(1, "Opening words and the rest of the chapter opening.");
    const fragment = sliceReaderVerse(source, 14, source.text.length);
    const { container } = render(<>{nodes(chapter({ verses: [fragment], paragraphStarts: [1], poetryBlocks: [{ beforeVerse: 1, level: 1 }] }))}</>);
    expect(container.querySelector(".chapter-drop-cap,.verse-num,.reader-number-joiner")).toBeNull();
    expect(container.querySelector(".scripture-poetry-continue")).not.toBeNull();
    expect(container.querySelector("[data-verse-body]")?.textContent).toBe(source.text.slice(14));
  });
  it("retains source text, original selection offsets and clickable number actions", () => {
    const source = verse(23, "  Exact  spacing and punctuation—unchanged.");
    const { container } = render(<>{nodes(chapter({ verses: [source], paragraphStarts: [23] }))}</>);
    const body = container.querySelector<HTMLElement>("[data-verse-body]")!;
    expect(body.textContent).toBe(versePlainText(source));
    expect(body.querySelector(".reader-number-joiner")).toBeNull();
    expect(offsetInVerseBody(body, body.querySelector(".reader-verse-first-word span")!.firstChild!, 4)).toBe(4);
    fireEvent.click(screen.getByRole("button", { name: "Verse 23" }));
    expect(numberClick).toHaveBeenCalledWith(expect.anything(), source, "Pro", 4);
  });
  it("measures exactly the same paragraph/number markup it displays", () => {
    const ch = chapter({ verses: [verse(1), verse(2), verse(12)], paragraphStarts: [1, 2, 12], poetryBlocks: [{ beforeVerse: 1, level: 1 }] });
    const stream = buildReaderStream([ch], { plateFocus: { bookAbbr: "NONE", chapter: 1 } });
    const measured = document.createElement("div");
    measured.innerHTML = buildStreamSliceMeasureHtml(stream, [ch], new Map(), "inline");
    const displayed = document.createElement("div");
    displayed.innerHTML = renderToStaticMarkup(<Fragment>{nodes(ch)}</Fragment>);
    for (const root of [measured, displayed]) root.querySelectorAll("[data-verse-id]").forEach(n => n.removeAttribute("data-verse-id"));
    expect(measured.innerHTML).toBe(displayed.innerHTML);
  });
});
