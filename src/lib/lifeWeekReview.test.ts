import { describe, expect, it } from "vitest";
import { computeLifeWeekIndex } from "@/lib/lifeWeeks";
import {
  buildPendingLifeWeekReview,
  emptyClosedWeekIndicesBySubject,
  needsPriorLifeWeekReview,
  pendingLifeWeekIndex,
  priorLifeWeekIndex,
  resolvePendingLifeWeekReview,
  resolvePendingLifeWeekReviews,
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
    const pending = buildPendingLifeWeekReview("1990-01-15", 99, "self", "Andrew");
    expect(pending?.weekIndex).toBe(99);
    expect(pending?.weekNumber).toBe(100);
    expect(pending?.subject).toBe("self");
    expect(pending?.chartKind).toBe("life-weeks");
    expect(pending?.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(pending?.weekRangeLabel).toContain("–");
  });

  it("buildPendingLifeWeekReview for family uses blink chart kind", () => {
    const pending = buildPendingLifeWeekReview("2015-06-01", 40, "lilly", "Lilly");
    expect(pending?.subject).toBe("lilly");
    expect(pending?.chartKind).toBe("blink");
    expect(pending?.personName).toBe("Lilly");
  });

  it("resolvePendingLifeWeekReview returns null when prior week closed", () => {
    const birth = "1990-01-15";
    const current = computeLifeWeekIndex(birth);
    expect(current).not.toBeNull();
    const prior = current!.currentWeekIndex - 1;
    expect(resolvePendingLifeWeekReview(birth, new Set([prior]), "self", "Andrew")).toBeNull();
  });

  it("resolvePendingLifeWeekReviews queues each person independently", () => {
    const closed = emptyClosedWeekIndicesBySubject();
    const pending = resolvePendingLifeWeekReviews(
      [
        { subject: "self", birthIso: "1990-01-15", personName: "Andrew" },
        { subject: "lilly", birthIso: "2015-06-01", personName: "Lilly" },
        { subject: "caroline", birthIso: "2018-03-10", personName: "Caroline" },
      ],
      closed,
    );
    expect(pending.length).toBe(3);
    expect(pending.map((p) => p.subject)).toEqual(["self", "lilly", "caroline"]);
  });
});
