import { describe, expect, it } from "vitest";
import type { PassageVerse } from "@/lib/bible/api";
import { buildReaderStream, ensureSpreadPageSplits } from "@/lib/bible/readerStream";
import { useReaderPagination } from "@/hooks/useReaderPagination";
import { renderHook } from "@testing-library/react";

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
});
