import { StrictMode, useMemo } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PassageVerse } from "@/lib/bible/api";
import {
  buildReaderStream,
  sliceReaderPage,
  sliceReaderSpreadPane,
  streamPageCount,
  type ReaderChapterPassage,
} from "@/lib/bible/readerStream";
import {
  useKeyedReaderStreamSplits,
  useReaderPagination,
} from "@/hooks/useReaderPagination";
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

function PaginationLifecycleHarness({
  chapters,
  paginationKey,
}: {
  chapters: ReaderChapterPassage[];
  paginationKey: string;
}) {
  const readerStream = useMemo(() => buildReaderStream(chapters), [chapters]);
  const { streamSplits, onStreamSplitsChange } =
    useKeyedReaderStreamSplits(paginationKey);
  const { streamSplitsReady } = useReaderPagination({
    useBookSpread: false,
    useStreamReader: true,
    useSpreadDoubleColumn: false,
    streamSplits,
    readerStream,
  });

  return (
    <>
      <output
        data-testid="pagination-state"
        data-ready={String(streamSplitsReady)}
        data-last-split={String(streamSplits.at(-1) ?? -1)}
      />
      <BookPaginator
        chapters={chapters}
        pageWidth={360}
        pageHeight={520}
        firstPageHeight={480}
        footerHeight={76}
        measurementKey={paginationKey}
        onSplitsChange={onStreamSplitsChange}
      />
    </>
  );
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
        footerHeight={76}
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

  it("keeps right-pane verses continuing after left pane in spread mode", async () => {
    const onSplitsChange = vi.fn();
    render(
      <BookPaginator
        chapters={longChapter(33).map((ch) => ({ ...ch, chapter: 13 }))}
        pageWidth={360}
        pageHeight={520}
        firstPageHeight={480}
        columnsClassName="scripture-columns-2"
        footerHeight={76}
        spreadMode
        onSplitsChange={onSplitsChange}
      />,
    );

    await waitFor(
      () => {
        const splits = onSplitsChange.mock.calls.at(-1)?.[0] as number[] | undefined;
        expect(splits).toBeDefined();
        expect(splits!.length).toBeGreaterThanOrEqual(4);
        for (let spreadIdx = 0; spreadIdx + 2 < splits!.length; spreadIdx += 2) {
          const leftEnd = splits![spreadIdx + 1]!;
          const spreadEnd = splits![spreadIdx + 2]!;
          expect(leftEnd).toBeGreaterThan(splits![spreadIdx]!);
          expect(spreadEnd).toBeGreaterThan(leftEnd);
        }
        const stream = buildReaderStream(
          longChapter(33).map((ch) => ({ ...ch, chapter: 13 })),
        );
        for (let spreadIdx = 0; spreadIdx + 2 < splits!.length; spreadIdx += 2) {
          const left = sliceReaderSpreadPane(stream, splits!, spreadIdx, "left", stream.length);
          const right = sliceReaderSpreadPane(stream, splits!, spreadIdx, "right", stream.length);
          if (!left?.verseGroups.length || !right?.verseGroups.length) continue;
          const leftLast = left.verseGroups.at(-1)!.verses.at(-1)!.number;
          const rightFirst = right.verseGroups[0]!.verses[0]!.number;
          expect(rightFirst).toBeGreaterThan(leftLast);
        }
        const renderedVerseNumbers = Array.from(
          { length: streamPageCount(splits!, stream.length) },
          (_, pageIndex) => sliceReaderPage(stream, splits!, pageIndex),
        )
          .flatMap((page) => page?.verseGroups ?? [])
          .flatMap((group) => group.verses.map((verse) => verse.number));
        expect(renderedVerseNumbers).toEqual(Array.from({ length: 33 }, (_, i) => i + 1));
      },
      { timeout: 3000 },
    );
  });

  it("remeasures when verse content or formatting changes with stable verse IDs", async () => {
    const onSplitsChange = vi.fn();
    const initialChapters = longChapter(2);
    const { rerender } = render(
      <BookPaginator
        chapters={initialChapters}
        pageWidth={360}
        pageHeight={520}
        firstPageHeight={480}
        columnsClassName="scripture-columns-2"
        footerHeight={76}
        spreadMode
        onSplitsChange={onSplitsChange}
      />,
    );

    await waitFor(() => expect(onSplitsChange).toHaveBeenCalled());
    onSplitsChange.mockClear();

    rerender(
      <BookPaginator
        chapters={initialChapters.map((chapter) => ({
          ...chapter,
          verses: chapter.verses.map((verse) =>
            verse.number === 1
              ? { ...verse, text: verse.text.replace("Verse", "Word!") }
              : verse,
          ),
          paragraphStarts: [1, 2],
          headings: [{ beforeVerse: 2, text: "A changed heading" }],
          poetryBlocks: [{ beforeVerse: 2, level: 1 }],
        }))}
        pageWidth={360}
        pageHeight={520}
        firstPageHeight={480}
        columnsClassName="scripture-columns-2"
        footerHeight={76}
        spreadMode
        onSplitsChange={onSplitsChange}
      />,
    );

    await waitFor(() => expect(onSplitsChange).toHaveBeenCalled());
  });

  it("keeps current pagination ready as adjacent chapters and layout generations change", async () => {
    const current = longChapter(16);
    const adjacent = [
      { ...longChapter(8)[0]!, chapter: 10 },
      current[0]!,
      { ...longChapter(9)[0]!, chapter: 12 },
    ];
    const { rerender } = render(
      <StrictMode>
        <PaginationLifecycleHarness
          chapters={current}
          paginationKey="Jos:11|layout-a"
        />
      </StrictMode>,
    );

    const paginationState = screen.getByTestId("pagination-state");
    await waitFor(() => {
      expect(paginationState).toHaveAttribute("data-ready", "true");
      expect(paginationState).toHaveAttribute(
        "data-last-split",
        String(buildReaderStream(current).length),
      );
    });

    rerender(
      <StrictMode>
        <PaginationLifecycleHarness
          chapters={adjacent}
          paginationKey="Jos:10|Jos:11|Jos:12|layout-a"
        />
      </StrictMode>,
    );
    await waitFor(() => {
      expect(paginationState).toHaveAttribute("data-ready", "true");
      expect(paginationState).toHaveAttribute(
        "data-last-split",
        String(buildReaderStream(adjacent).length),
      );
    });

    rerender(
      <StrictMode>
        <PaginationLifecycleHarness
          chapters={adjacent}
          paginationKey="Jos:10|Jos:11|Jos:12|layout-b"
        />
      </StrictMode>,
    );
    await waitFor(() => {
      expect(paginationState).toHaveAttribute("data-ready", "true");
      expect(paginationState).toHaveAttribute(
        "data-last-split",
        String(buildReaderStream(adjacent).length),
      );
    });
  });
});
