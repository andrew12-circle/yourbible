import { describe, expect, it } from "vitest";
import {
  bubbleLayout,
  DEFAULT_SCREEN_BUBBLE_LAYOUT,
} from "@/lib/journal/screenRecordingComposite";

describe("bubbleLayout", () => {
  it("places bubble on bottom-left with padding", () => {
    const { x, y, bubbleW, bubbleH } = bubbleLayout(
      1920,
      1080,
      DEFAULT_SCREEN_BUBBLE_LAYOUT,
      0.75,
    );
    expect(x).toBeGreaterThan(0);
    expect(y + bubbleH).toBeLessThanOrEqual(1080);
    expect(x).toBeLessThan(1920 * 0.1);
    expect(bubbleW).toBeGreaterThan(0);
  });
});
