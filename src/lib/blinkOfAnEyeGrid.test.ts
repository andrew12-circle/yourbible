import { describe, expect, it } from "vitest";

import {
  BLINK_WEEKS_PER_YEAR,
  BLINK_WEEKS_TOTAL,
  BLINK_YEARS,
  blinkWeekIndexToPos,
} from "@/lib/blinkOfAnEyeGrid";
import { advanceChartSlot, writeStoredChartSlot } from "@/lib/lifeChartRotation";

describe("blinkOfAnEyeGrid", () => {
  it("covers 18 years of weeks", () => {
    expect(BLINK_YEARS * BLINK_WEEKS_PER_YEAR).toBe(BLINK_WEEKS_TOTAL);
  });

  it("maps week 0 to year 0 week 0", () => {
    expect(blinkWeekIndexToPos(0)).toEqual({ year: 0, week: 0 });
  });

  it("fills a year column before advancing", () => {
    expect(blinkWeekIndexToPos(51)).toEqual({ year: 0, week: 51 });
    expect(blinkWeekIndexToPos(52)).toEqual({ year: 1, week: 0 });
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
