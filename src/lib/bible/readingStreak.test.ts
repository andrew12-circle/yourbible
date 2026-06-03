import { describe, expect, it } from "vitest";
import { currentReadingStreak } from "@/lib/bible/readingStreak";

describe("currentReadingStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(currentReadingStreak(["2026-06-01", "2026-06-02", "2026-06-03"], "2026-06-03")).toBe(3);
  });

  it("allows streak ending yesterday when today is empty", () => {
    expect(currentReadingStreak(["2026-06-01", "2026-06-02"], "2026-06-03")).toBe(2);
  });
});
