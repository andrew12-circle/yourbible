import { describe, expect, it } from "vitest";
import { computeLifeWeekIndex } from "@/lib/lifeWeeks";
import {
  buildPendingLifeWeekReview,
  needsPriorLifeWeekReview,
  pendingLifeWeekIndex,
  priorLifeWeekIndex,
  resolvePendingLifeWeekReview,
} from "@/lib/lifeWeekReview";

describe("lifeWeekReview", () => {
  it("priorLifeWeekIndex is one before current", () => {
    expect(priorLifeWeekIndex(0)).toBe(-1);
    expect(priorLifeWeekIndex(10)).toBe(9);
  });

  it("needsPriorLifeWeekReview when immediate prior week is not closed", () => {
    expect(needsPriorLifeWeekReview(5, new Set())).toBe(true);
    expect(needsPriorLifeWeekReview(5, new Set([4]))).toBe(false);
    expect(needsPriorLifeWeekReview(5, new Set([0, 1, 2]))).toBe(true);
    expect(needsPriorLifeWeekReview(0, new Set())).toBe(false);
  });

  it("pendingLifeWeekIndex is only the immediate prior week", () => {
    expect(pendingLifeWeekIndex(5, new Set([0, 1]))).toBe(4);
    expect(pendingLifeWeekIndex(5, new Set([4]))).toBeNull();
  });

  it("buildPendingLifeWeekReview for a known birth date", () => {
    const pending = buildPendingLifeWeekReview("1990-01-15", 99);
    expect(pending?.weekIndex).toBe(99);
    expect(pending?.weekNumber).toBe(100);
    expect(pending?.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(pending?.weekRangeLabel).toContain("–");
  });

  it("resolvePendingLifeWeekReview returns null when prior week closed", () => {
    const birth = "1990-01-15";
    const current = computeLifeWeekIndex(birth);
    expect(current).not.toBeNull();
    const prior = current!.currentWeekIndex - 1;
    expect(resolvePendingLifeWeekReview(birth, Date.now(), new Set([prior]))).toBeNull();
  });
});
