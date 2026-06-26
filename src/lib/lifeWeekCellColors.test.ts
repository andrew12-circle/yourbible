import { describe, expect, it } from "vitest";

import { BLINK_WEEKS_TOTAL } from "@/lib/blinkOfAnEyeGrid";
import { LIFE_WEEKS_TOTAL } from "@/lib/lifeWeeks";
import { GRID_COLS } from "@/lib/lifeWeeksGrid";
import {
  LIFE_WEEK_PALETTE,
  buildLifeWeekColorMap,
  lifeWeekColorAt,
  lifeWeekColorMapHasNoAdjacentDuplicates,
  lifeWeekColorSeed,
} from "@/lib/lifeWeekCellColors";

describe("lifeWeekCellColors", () => {
  it("uses the requested palette", () => {
    expect(LIFE_WEEK_PALETTE).toEqual([
      "#2563EB",
      "#16A34A",
      "#DC2626",
      "#EAB308",
      "#9333EA",
      "#EC4899",
      "#F97316",
    ]);
  });

  it("never assigns the same color to orthogonal neighbors on the full grid", () => {
    const map = buildLifeWeekColorMap(lifeWeekColorSeed("1990-04-10"), LIFE_WEEKS_TOTAL, GRID_COLS);
    expect(lifeWeekColorMapHasNoAdjacentDuplicates(map, LIFE_WEEKS_TOTAL, GRID_COLS)).toBe(true);
  });

  it("never assigns the same color to orthogonal neighbors on blink grids", () => {
    const map = buildLifeWeekColorMap(lifeWeekColorSeed("2023-04-10", "blink"), BLINK_WEEKS_TOTAL, 52);
    expect(lifeWeekColorMapHasNoAdjacentDuplicates(map, BLINK_WEEKS_TOTAL, 52)).toBe(true);
  });

  it("is stable for the same seed", () => {
    const seed = lifeWeekColorSeed("2018-06-01");
    const a = buildLifeWeekColorMap(seed, 520, 52);
    const b = buildLifeWeekColorMap(seed, 520, 52);
    expect(lifeWeekColorAt(a, 42)).toBe(lifeWeekColorAt(b, 42));
  });

  it("varies between different people", () => {
    const a = buildLifeWeekColorMap(lifeWeekColorSeed("2018-06-01"), 520, 52);
    const b = buildLifeWeekColorMap(lifeWeekColorSeed("2021-03-15"), 520, 52);
    let same = 0;
    for (let i = 0; i < 520; i++) {
      if (a[i] === b[i]) same++;
    }
    expect(same).toBeLessThan(520);
  });
});
