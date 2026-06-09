import { describe, expect, it } from "vitest";
import { computeEditorCaretScrollDelta } from "./scrollEditorCaretIntoView";

describe("computeEditorCaretScrollDelta", () => {
  it("scrolls down when the caret sits below the visible band", () => {
    const next = computeEditorCaretScrollDelta({
      scrollTop: 0,
      visibleTop: 120,
      visibleBottom: 540,
      caretTop: 520,
      caretBottom: 540,
      caretAnchorRatio: 0.45,
    });

    expect(next).toBeGreaterThan(0);
  });

  it("scrolls up when the caret sits above the visible band", () => {
    const next = computeEditorCaretScrollDelta({
      scrollTop: 240,
      visibleTop: 120,
      visibleBottom: 540,
      caretTop: 70,
      caretBottom: 90,
    });

    expect(next).toBeLessThan(240);
  });

  it("leaves scroll position unchanged when the caret is already comfortable", () => {
    const next = computeEditorCaretScrollDelta({
      scrollTop: 120,
      visibleTop: 120,
      visibleBottom: 540,
      caretTop: 250,
      caretBottom: 270,
    });

    expect(next).toBe(120);
  });
});
