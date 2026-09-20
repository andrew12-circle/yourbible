import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useReaderFitCorrection } from "./useReaderFitCorrection";
describe("bounded book-page corrections", () => {
  it("deduplicates facing-page reports and resets on genuine layout changes", () => {
    const { result, rerender } = renderHook(({ scope }) => useReaderFitCorrection(scope), { initialProps: { scope: "layout-a" } });
    act(() => { result.current.requestCorrection(3); result.current.requestCorrection(3); });
    expect(result.current.reserve).toBe(16);
    rerender({ scope: "layout-b" });
    expect(result.current.reserve).toBe(0);
  });
  it("cannot remeasure forever or shrink a font to hide an oversized unit", () => {
    const { result } = renderHook(() => useReaderFitCorrection("layout"));
    for (let i = 0; i < 6; i++) act(() => result.current.requestCorrection(1000));
    expect(result.current.reserve).toBe(256);
    expect(result.current.canCorrect).toBe(false);
  });
});
