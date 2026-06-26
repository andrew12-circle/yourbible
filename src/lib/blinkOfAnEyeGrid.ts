/**
 * Poster layout: 18 year-columns (life-years 0–17) × 52 week-rows.
 * Column N = age N until the (N+1)th birthday (column 0 = birth until age 1).
 * Includes the 17th full year (column 17, age 17). Gone at 18 — no label 18.
 */

export const BLINK_YEARS = 18;
export const BLINK_WEEKS_PER_YEAR = 52;
export const BLINK_WEEKS_TOTAL = BLINK_YEARS * BLINK_WEEKS_PER_YEAR;

export const BLINK_CELL = 8;
export const BLINK_GAP = 3;
export const BLINK_MARGIN_LEFT = 26;
export const BLINK_MARGIN_TOP = 18;
export const BLINK_AXIS_FONT = 6;
export const BLINK_TICK_FONT = 6;
export const BLINK_YEARS_LABEL_Y = 8;
export const BLINK_YEAR_TICK_Y = 16;

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

export const BLINK_GRID_W = BLINK_MARGIN_LEFT + blinkGridWidthPx() + 32;
export const BLINK_GRID_H = BLINK_MARGIN_TOP + blinkGridHeightPx() + 24;

/** Map linear week index to poster cell (year column, week row). */
export function blinkWeekIndexToPos(weekIndex: number): { year: number; week: number } {
  const clamped = Math.max(0, Math.min(BLINK_WEEKS_TOTAL - 1, weekIndex));
  return {
    year: Math.floor(clamped / BLINK_WEEKS_PER_YEAR),
    week: clamped % BLINK_WEEKS_PER_YEAR,
  };
}
