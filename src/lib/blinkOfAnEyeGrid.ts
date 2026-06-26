/**
 * Poster layout: 18 year-columns (life-years 0–17) × 52 week-rows.
 * Column N = age N until the (N+1)th birthday (column 0 = birth until age 1).
 * Includes the 17th full year (column 17, age 17). Gone at 18 — no label 18.
 */

import { GRID_W, LABEL_SIZE } from "@/lib/lifeWeeksGrid";

export const BLINK_YEARS = 18;
export const BLINK_WEEKS_PER_YEAR = 52;
export const BLINK_WEEKS_TOTAL = BLINK_YEARS * BLINK_WEEKS_PER_YEAR;

export const BLINK_CELL = 5;
export const BLINK_GAP = 1;
export const BLINK_MARGIN_LEFT = 18;
export const BLINK_MARGIN_TOP = 12;

export const BLINK_WEEK_TICKS = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52] as const;
/** Column labels 0–17 — through the 17th full life-year at home. */
export const BLINK_YEAR_TICKS = Array.from({ length: BLINK_YEARS }, (_, i) => i) as number[];

export function blinkColX(year: number): number {
  return year * (BLINK_CELL + BLINK_GAP);
}

export function blinkRowY(week: number): number {
  return week * (BLINK_CELL + BLINK_GAP);
}

export function blinkGridWidthPx(): number {
  return blinkColX(BLINK_YEARS - 1) + BLINK_CELL;
}

export function blinkGridHeightPx(): number {
  return blinkRowY(BLINK_WEEKS_PER_YEAR - 1) + BLINK_CELL;
}

/** X position for a year tick — centered on its column. */
export function blinkYearTickX(year: number): number {
  return blinkColX(year) + BLINK_CELL / 2;
}

export const BLINK_GRID_W = BLINK_MARGIN_LEFT + blinkGridWidthPx() + 18;
export const BLINK_GRID_H = BLINK_MARGIN_TOP + blinkGridHeightPx() + 14;

/** Match life-weeks axis label size when the poster is scaled to the same display width. */
const BLINK_LABEL_PX = (LABEL_SIZE * BLINK_GRID_W) / GRID_W;
export const BLINK_AXIS_FONT = BLINK_LABEL_PX;
export const BLINK_TICK_FONT = BLINK_LABEL_PX;
export const BLINK_YEARS_LABEL_Y = BLINK_LABEL_PX * 0.9;
export const BLINK_YEAR_TICK_Y = BLINK_MARGIN_TOP - 2;
export const BLINK_FOOTER_FONT = BLINK_LABEL_PX * 0.85;

/** Map linear week index to poster cell (year column, week row). */
export function blinkWeekIndexToPos(weekIndex: number): { year: number; week: number } {
  const clamped = Math.max(0, Math.min(BLINK_WEEKS_TOTAL - 1, weekIndex));
  return {
    year: Math.floor(clamped / BLINK_WEEKS_PER_YEAR),
    week: clamped % BLINK_WEEKS_PER_YEAR,
  };
}

/** Zoomed viewBox for week-review check-off snippet on Blink poster grid. */
export function blinkReviewSnippetViewBox(weekIndex: number): string {
  const { year, week } = blinkWeekIndexToPos(weekIndex);
  const padYear = 2;
  const padWeek = 8;
  const minYear = Math.max(0, year - padYear);
  const maxYear = Math.min(BLINK_YEARS - 1, year + padYear);
  const minWeek = Math.max(0, week - padWeek);
  const maxWeek = Math.min(BLINK_WEEKS_PER_YEAR - 1, week + padWeek);
  const x0 = BLINK_MARGIN_LEFT + blinkColX(minYear) - 8;
  const y0 = BLINK_MARGIN_TOP + blinkRowY(minWeek) - 8;
  const x1 = BLINK_MARGIN_LEFT + blinkColX(maxYear) + BLINK_CELL + 8;
  const y1 = BLINK_MARGIN_TOP + blinkRowY(maxWeek) + BLINK_CELL + 8;
  return `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;
}

export function blinkWeekIndicesInReviewWindow(weekIndex: number): number[] {
  const { year, week } = blinkWeekIndexToPos(weekIndex);
  const padYear = 2;
  const padWeek = 8;
  const minYear = Math.max(0, year - padYear);
  const maxYear = Math.min(BLINK_YEARS - 1, year + padYear);
  const minWeek = Math.max(0, week - padWeek);
  const maxWeek = Math.min(BLINK_WEEKS_PER_YEAR - 1, week + padWeek);
  const indices: number[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    for (let w = minWeek; w <= maxWeek; w++) {
      indices.push(y * BLINK_WEEKS_PER_YEAR + w);
    }
  }
  return indices;
}
