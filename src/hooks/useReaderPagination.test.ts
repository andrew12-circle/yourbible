import { describe, expect, it } from "vitest";
import type { PassageVerse } from "@/lib/bible/api";
import { buildReaderStream, ensureSpreadPageSplits } from "@/lib/bible/readerStream";
import {
  useKeyedReaderStreamSplits,
  useReaderPagination,
} from "@/hooks/useReaderPagination";
import { act, renderHook } from "@testing-library/react";

function verses(nums: number[]): PassageVerse[] {
  return nums.map((n) => ({ number: n, text: `Verse ${n}.` }));
}

describe("useReaderPagination", () => {
  it("normalizes spread splits for book mode", () => {
    const stream = buildReaderStream([
      {
        bookAbbr: "Jos",
        bookName: "Joshua",
        chapter: 11,
        verses: verses(Array.from({ length: 20 }, (_, i) => i + 1)),
        paragraphStarts: [1],
        headings: [],
        poetryBlocks: [],
      },
    ]);
    const splits = ensureSpreadPageSplits([0, stream.length], stream);
    const { result } = renderHook(() =>
      useReaderPagination({
        useBookSpread: true,
        useStreamReader: true,
        useSpreadDoubleColumn: true,
        streamSplits: splits,
        readerStream: stream,
      }),
    );
    expect(result.current.streamSplitsReady).toBe(true);
    expect(result.current.totalStreamPages).toBeGreaterThan(1);
  });

  it("keeps measured splits keyed through empty, current, and adjacent stream transitions", () => {
    const { result, rerender } = renderHook(
      ({ paginationKey }) => useKeyedReaderStreamSplits(paginationKey),
      { initialProps: { paginationKey: "empty|layout-a" } },
    );

    expect(result.current.streamSplits).toEqual([0]);

    rerender({ paginationKey: "Jhn:1|layout-a" });
    const publishCurrentChapter = result.current.onStreamSplitsChange;
    act(() => publishCurrentChapter([0, 8, 16]));
    expect(result.current.streamSplits).toEqual([0, 8, 16]);

    rerender({ paginationKey: "Jhn:1|Jhn:2|layout-a" });
    const publishAdjacentChapters = result.current.onStreamSplitsChange;
    expect(result.current.streamSplits).toEqual([0]);

    // A late measurement from the previous composition must stay hidden.
    act(() => publishCurrentChapter([0, 7, 14]));
    expect(result.current.streamSplits).toEqual([0]);

    act(() => publishAdjacentChapters([0, 9, 18, 27]));
    expect(result.current.streamSplits).toEqual([0, 9, 18, 27]);

    // A stale callback that arrives after the current measurement cannot erase it.
    act(() => publishCurrentChapter([0, 6, 12]));
    expect(result.current.streamSplits).toEqual([0, 9, 18, 27]);
  });
});
