import { describe, expect, it } from "vitest";
import { computeDailySummary } from "@/lib/habits/dailySummary";
import { completionKey } from "@/lib/habits/stats";

describe("computeDailySummary", () => {
  const habitIds = ["h1", "h2"];
  const yearMonth = "2026-06";

  it("marks future days as locked", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const points = computeDailySummary(2, habitIds, new Set(), new Set(), yearMonth, now);
    expect(points[25]?.locked).toBe(true);
    expect(points[25]?.pct).toBeNull();
    expect(points[0]?.locked).toBe(false);
  });

  it("computes credited completion percentage per day", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const credit = new Set([completionKey("h1", 2026, 6, 1)]);
    const points = computeDailySummary(2, habitIds, credit, credit, yearMonth, now);
    expect(points[0]?.pct).toBe(50);
    expect(points[0]?.displayLabel).toBe("50%");
  });
});
