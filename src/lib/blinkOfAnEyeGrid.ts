/** Poster layout: 18 year-columns × 52 week-rows (weeks run top → bottom). */

export const BLINK_YEARS = 18;
export const BLINK_WEEKS_PER_YEAR = 52;
export const BLINK_WEEKS_TOTAL = BLINK_YEARS * BLINK_WEEKS_PER_YEAR;

export const BLINK_CELL = 6;
export const BLINK_GAP = 1;
export const BLINK_MARGIN_TOP = 44;
export const BLINK_MARGIN_LEFT = 28;
export const BLINK_LABEL_SIZE = 8;

export const BLINK_WEEK_TICKS = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52] as const;
export const BLINK_YEAR_TICKS = Array.from({ length: BLINK_YEARS + 1 }, (_, i) => i) as number[];

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

export const BLINK_GRID_W = BLINK_MARGIN_LEFT + blinkGridWidthPx() + 24;
export const BLINK_GRID_H = BLINK_MARGIN_TOP + blinkGridHeightPx() + 36;

/** Map linear week index to poster cell (year column, week row). */
export function blinkWeekIndexToPos(weekIndex: number): { year: number; week: number } {
  const clamped = Math.max(0, Math.min(BLINK_WEEKS_TOTAL - 1, weekIndex));
  return {
    year: Math.floor(clamped / BLINK_WEEKS_PER_YEAR),
    week: clamped % BLINK_WEEKS_PER_YEAR,
  };
}
