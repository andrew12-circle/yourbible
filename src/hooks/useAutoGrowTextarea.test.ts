import { describe, expect, it } from "vitest";
import { textareaHeightForLines, TEXTAREA_LINE_HEIGHT_PX } from "@/hooks/useAutoGrowTextarea";

describe("textareaHeightForLines", () => {
  it("uses 7 lines before max scroll height", () => {
    const seven = textareaHeightForLines(7);
    const six = textareaHeightForLines(6);
    expect(seven).toBeGreaterThan(six);
    expect(seven - six).toBeCloseTo(TEXTAREA_LINE_HEIGHT_PX, 0);
  });
});
