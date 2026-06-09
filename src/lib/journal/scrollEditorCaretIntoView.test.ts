import { describe, expect, it } from "vitest";
import { computeEditorCaretScrollDelta } from "./scrollEditorCaretIntoView";

describe("computeEditorCaretScrollDelta", () => {
  it("scrolls down when the caret sits below the bottom chrome", () => {
    const next = computeEditorCaretScrollDelta({
      scrollTop: 0,
      scrollViewportTop: 80,
      caretTop: 520,
      caretBottom: 540,
      viewportHeight: 700,
      bottomInsetPx: 160,
      caretAnchorRatio: 0.45,
    });

    expect(next).toBeGreaterThan(0);
  });

  it("scrolls up when the caret sits above the visible band", () => {
    const next = computeEditorCaretScrollDelta({
      scrollTop: 240,
      scrollViewportTop: 80,
      caretTop: 70,
      caretBottom: 90,
      viewportHeight: 700,
      bottomInsetPx: 160,
    });

    expect(next).toBeLessThan(240);
  });

  it("leaves scroll position unchanged when the caret is already comfortable", () => {
    const next = computeEditorCaretScrollDelta({
      scrollTop: 120,
      scrollViewportTop: 80,
      caretTop: 250,
      caretBottom: 270,
      viewportHeight: 700,
      bottomInsetPx: 160,
    });

    expect(next).toBe(120);
  });
});
