import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useReaderPosition } from "@/hooks/useReaderPosition";
const verses = Array.from({ length: 12 }, (_, i) => ({ number: i + 1, text: `Synthetic verse ${i + 1}.` }));
const base = { bibleId: "fixture", bookAbbr: "Jhn", chapter: 3, verses, stream: [], useStream: false, splits: [0, 4, 8, 12], ready: true, spread: false, layoutKey: "large-page" };
describe("Scripture-based reading position", () => {
  it("preserves the first reading verse through font/column reflow", () => {
    const { result, rerender } = renderHook((options) => useReaderPosition(options), { initialProps: base });
    act(() => result.current.setPage(1)); expect(result.current.anchor?.verse).toBe(5);
    rerender({ ...base, splits: [0, 2, 4, 6, 8, 10, 12], layoutKey: "smaller-page" });
    expect(result.current.page).toBe(2); expect(result.current.anchor?.verse).toBe(5);
  });
  it("lands at the end after backward chapter navigation", () => {
    const { result } = renderHook(() => useReaderPosition({ ...base, enterAtEnd: true }));
    expect(result.current.page).toBe(2); expect(result.current.anchor?.verse).toBe(9);
  });
  it("does not reuse another chapter's page index while loading", () => {
    const { result, rerender } = renderHook((options) => useReaderPosition(options), { initialProps: base });
    act(() => result.current.setPage(2)); rerender({ ...base, chapter: 4, verses: [], ready: false, layoutKey: "pending" });
    expect(result.current.page).toBe(0); expect(result.current.anchor).toBeNull();
  });
  it("honors direct verse links and batches rapid page updates", () => {
    const { result } = renderHook(() => useReaderPosition({ ...base, requestedVerse: 5 }));
    expect(result.current.page).toBe(1);
    act(() => { result.current.setPage((n) => n - 1); result.current.setPage((n) => n + 2); });
    expect(result.current.page).toBe(2);
  });
});
