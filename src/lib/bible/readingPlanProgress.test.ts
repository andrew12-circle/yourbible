import { describe, expect, it } from "vitest";
import { findNextReadingPlanDay, formatReadingPlanReference } from "@/lib/bible/readingPlanProgress";

describe("findNextReadingPlanDay", () => {
  it("returns the next day on the plan with the most progress", () => {
    const next = findNextReadingPlanDay([
      { plan_id: "john-21", day_index: 1 },
      { plan_id: "john-21", day_index: 2 },
      { plan_id: "romans-16", day_index: 1 },
    ]);
    expect(next?.plan.id).toBe("john-21");
    expect(next?.dayIndex).toBe(3);
    expect(next?.dayTitle).toBe("John 3");
  });

  it("skips plans that are not started yet", () => {
    expect(findNextReadingPlanDay([])).toBeNull();
  });

  it("skips completed plans", () => {
    const done = Array.from({ length: 21 }, (_, i) => ({ plan_id: "john-21", day_index: i + 1 }));
    expect(findNextReadingPlanDay(done)).toBeNull();
  });
});

describe("formatReadingPlanReference", () => {
  it("formats single and multi-chapter days", () => {
    expect(formatReadingPlanReference([{ book: "Jhn", chapter: 3 }])).toBe("Jhn 3");
    expect(formatReadingPlanReference([
      { book: "Psa", chapter: 1 },
      { book: "Psa", chapter: 2 },
    ])).toBe("Psa 1 · Psa 2");
  });
});
