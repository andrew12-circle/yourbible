import { describe, expect, it } from "vitest";
import {
  journalVideoDialogVideoSize,
  journalVideoFloatingDefaultRect,
  journalVideoFloatingResize,
} from "@/lib/journal/journalVideoFloatingLayout";

describe("journalVideoFloatingLayout", () => {
  it("matches dialog max width on a wide viewport", () => {
    const video = journalVideoDialogVideoSize({ width: 1440, height: 900 });
    expect(video.width).toBe(768);
    expect(video.height).toBe(432);
  });

  it("centers the default floating rect", () => {
    const rect = journalVideoFloatingDefaultRect({ width: 1440, height: 900 });
    expect(rect.width).toBe(768);
    expect(rect.x).toBe(Math.round((1440 - 768) / 2));
    expect(rect.y).toBeGreaterThan(0);
  });

  it("shrinks when resizing smaller", () => {
    const start = journalVideoFloatingDefaultRect({ width: 1440, height: 900 });
    const smaller = journalVideoFloatingResize(start, -200, -100, {
      width: 1440,
      height: 900,
    });
    expect(smaller.width).toBeLessThan(start.width);
    expect(smaller.height).toBeLessThan(start.height);
  });
});
