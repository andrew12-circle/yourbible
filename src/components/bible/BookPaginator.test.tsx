import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PassageVerse } from "@/lib/bible/api";
import { streamPageCount } from "@/lib/bible/readerStream";
import { BookPaginator } from "./BookPaginator";

/** Simulates ~8 verse stream units fitting on one 2-column page. */
vi.mock("@/lib/bible/readerColumnMeasure", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/bible/readerColumnMeasure")>();
  return {
    ...original,
    scriptureContentFitsPage: vi.fn((node: HTMLDivElement) => {
      const verseCount = node.querySelectorAll("[data-verse]").length;
      return verseCount <= 8;
    }),
  };
});

function longChapter(verseCount: number) {
  const verses: PassageVerse[] = Array.from({ length: verseCount }, (_, i) => ({
    number: i + 1,
    text: `Verse ${i + 1} with enough text to simulate a real paragraph in the reader.`,
  }));
  return [
    {
      bookAbbr: "Jos",
      bookName: "Joshua",
      chapter: 11,
      verses,
      paragraphStarts: [1],
      headings: [{ beforeVerse: 1, text: "Conquest of Northern Cities" }],
      poetryBlocks: [],
    },
  ];
}

describe("BookPaginator spread mode", () => {
  it("paginates a long chapter across multiple spreads in spread mode", async () => {
    const onSplitsChange = vi.fn();
    render(
      <BookPaginator
        chapters={longChapter(40)}
        pageWidth={360}
        pageHeight={520}
        firstPageHeight={480}
        columnsClassName="scripture-columns-2"
        footerHeight={32}
        spreadMode
        onSplitsChange={onSplitsChange}
      />,
    );

    await waitFor(
      () => {
        const lastCall = onSplitsChange.mock.calls.at(-1)?.[0] as number[] | undefined;
        expect(lastCall).toBeDefined();
        expect(lastCall!.length).toBeGreaterThan(3);
        expect(lastCall![0]).toBe(0);
        expect(lastCall!.at(-1)).toBeGreaterThan(40);
        expect(streamPageCount(lastCall!, lastCall!.at(-1)!)).toBeGreaterThan(2);
      },
      { timeout: 3000 },
    );
  });
});
