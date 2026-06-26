import { describe, expect, it } from "vitest";

import {
  BLINK_WEEKS_PER_YEAR,
  BLINK_WEEKS_TOTAL,
  BLINK_YEARS,
  BLINK_YEAR_TICKS,
  blinkWeekIndexToPos,
  blinkYearTickX,
  blinkColX,
  BLINK_CELL,
} from "@/lib/blinkOfAnEyeGrid";
import { advanceChartSlot, writeStoredChartSlot } from "@/lib/lifeChartRotation";

describe("blinkOfAnEyeGrid", () => {
  it("has 18 columns for life-years 0–17 (17th full year included)", () => {
    expect(BLINK_YEARS).toBe(18);
    expect(BLINK_YEAR_TICKS).toHaveLength(18);
    expect(BLINK_YEAR_TICKS[0]).toBe(0);
    expect(BLINK_YEAR_TICKS[17]).toBe(17);
    expect(BLINK_YEAR_TICKS).not.toContain(18);
    expect(BLINK_YEARS * BLINK_WEEKS_PER_YEAR).toBe(BLINK_WEEKS_TOTAL);
  });

  it("maps week 0 to year 0 week 0", () => {
    expect(blinkWeekIndexToPos(0)).toEqual({ year: 0, week: 0 });
  });

  it("fills a year column before advancing", () => {
    expect(blinkWeekIndexToPos(51)).toEqual({ year: 0, week: 51 });
    expect(blinkWeekIndexToPos(52)).toEqual({ year: 1, week: 0 });
  });

  it("aligns year ticks to column centers", () => {
    expect(blinkYearTickX(0)).toBe(BLINK_CELL / 2);
    expect(blinkYearTickX(17)).toBe(blinkColX(17) + BLINK_CELL / 2);
  });
});

describe("lifeChartRotation", () => {
  it("advances through available slots in order", () => {
    writeStoredChartSlot("self");
    expect(advanceChartSlot(["self", "lilly", "caroline"])).toBe("lilly");
    expect(advanceChartSlot(["self", "lilly", "caroline"])).toBe("caroline");
    expect(advanceChartSlot(["self", "lilly", "caroline"])).toBe("self");
  });
});
