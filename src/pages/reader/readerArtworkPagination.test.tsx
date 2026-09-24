import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildStreamSliceMeasureHtml } from "@/lib/bible/streamSliceMeasureHtml";
import { paginateReaderStream } from "@/lib/bible/paginateReaderStream";
import { sliceReaderPage, type ReaderChapterPassage, type ReaderStreamUnit } from "@/lib/bible/readerStream";
import { readerPageForUnit } from "@/hooks/useReaderPosition";
import { renderReaderPageScripture, type ReaderPageScriptureArgs } from "./renderReaderPageScripture";

vi.mock("@/components/bible/ScripturePlate", () => ({
  ScripturePlate: ({ plate }: { plate: { id: string; title: string } }) => <figure data-testid="full-page-artwork" data-reader-plate={plate.id}>{plate.title}</figure>,
}));
const chapter: ReaderChapterPassage = {
  bookAbbr: "Mat", bookName: "Matthew", chapter: 27,
  verses: Array.from({ length: 4 }, (_, index) => ({ number: index + 1, text: `Synthetic verse ${index + 1}.` })),
  paragraphStarts: [1, 3], headings: [{ beforeVerse: 1, text: "Test heading" }], poetryBlocks: [],
};
const stream: ReaderStreamUnit[] = [{ kind: "chapter-header", bookAbbr: "Mat", bookName: "Matthew", chapter: 27 }];
for (const verse of chapter.verses) {
  if ([2, 3].includes(verse.number)) stream.push({ kind: "plate", bookAbbr: "Mat", bookName: "Matthew", chapter: 27,
    plate: { id: `scene-${verse.number}`, bookAbbr: "Mat", chapter: 27, beforeVerse: verse.number, title: `Scene ${verse.number}`, referenceLabel: `Matthew 27:${verse.number}`, imageUrl: `/scene-${verse.number}.webp`, alt: "Test artwork" } });
  stream.push({ kind: "verse", bookAbbr: "Mat", bookName: "Matthew", chapter: 27, verse });
}
const splits = paginateReaderStream(stream, () => true);
function args(page: number): ReaderPageScriptureArgs {
  return {
    scrollMode: false, useStreamReader: true, streamChapters: [chapter], scrollDocumentBlocks: [],
    verses: chapter.verses, slice: null, book: { abbr: "Mat", name: "Matthew" }, chapter: 27,
    paragraphStarts: new Set([1, 3]), headingByVerse: new Map(), passagePoetryBlocks: [],
    streamSlice: sliceReaderPage(stream, splits, page), pageContentReady: true, inlineChapterPlates: [],
    renderVerse: verse => <span key={verse.number}>{verse.text}</span>,
    activeStudyLayout: "inline", useStudyPageStack: false, spreadColumnLayout: "double",
    holmanVerseGroups: [], showPageFootnotes: false, holmanFootnoteVerses: [], showHolmanConnections: false,
    stackContentHeightPx: 700, scriptureColumnHeightPx: 700,
  };
}

describe("artwork-independent text rendering", () => {
  it("produces the exact same measurement markup with and without artwork anchors", () => {
    const withArtwork = buildStreamSliceMeasureHtml(stream, [chapter], new Map(), "inline");
    const withoutArtwork = buildStreamSliceMeasureHtml(stream.filter(unit => unit.kind !== "plate"), [chapter], new Map(), "inline");
    expect(withArtwork).toBe(withoutArtwork);
    expect(withArtwork).not.toContain("<img");
    expect(withArtwork).not.toContain("<figure");
    expect(withArtwork).not.toContain("Scene 2");
  });
  it("shows one full-page scene at a time without changing the Scripture or page cuts", () => {
    const originalCuts = [...splits];
    render(<><section>{renderReaderPageScripture(args(0))}</section><section data-testid="scripture">{renderReaderPageScripture(args(1))}</section></>);
    const text = screen.getByTestId("scripture").textContent;
    expect(screen.getAllByTestId("full-page-artwork")).toHaveLength(1);
    expect(screen.getByTestId("full-page-artwork")).toHaveAttribute("data-reader-plate", "scene-2");
    fireEvent.click(screen.getByRole("button", { name: "Next scene on this page" }));
    expect(screen.getAllByTestId("full-page-artwork")).toHaveLength(1);
    expect(screen.getByTestId("full-page-artwork")).toHaveAttribute("data-reader-plate", "scene-3");
    expect(screen.getByTestId("scripture").textContent).toBe(text);
    expect(splits).toEqual(originalCuts);
  });
  it("opens mobile chapter artwork but lands verse links on Scripture", () => {
    expect(readerPageForUnit(splits, 0, false, true)).toBe(0);
    const verse = stream.findIndex(unit => unit.kind === "verse" && unit.verse.number === 2);
    expect(readerPageForUnit(splits, verse, false)).toBe(1);
    expect(readerPageForUnit(splits, verse, true)).toBe(0);
  });
});
