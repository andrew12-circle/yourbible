/** SVG layout constants and helpers for the life-weeks grid (13×4 weeks per year, 120 years). */

export const CELL = 12;
export const GAP = 2;
export const COL_GROUP_GAP = 3;
export const DECADE_ROW_GAP = 6;
export const MARGIN_TOP = 32;
export const MARGIN_LEFT = 36;
export const LABEL_SIZE = 11;

/** Weeks per horizontal row within one age year. */
export const WEEKS_PER_ROW = 13;
/** Rows per age year (WEEKS_PER_ROW × ROWS_PER_YEAR = 52). */
export const ROWS_PER_YEAR = 4;
export const GRID_COLS = WEEKS_PER_ROW;
export const GRID_ROWS = 120 * ROWS_PER_YEAR;

export function colX(c: number): number {
  return c * (CELL + GAP);
}

export function rowY(r: number): number {
  return r * (CELL + GAP) + Math.floor(r / (ROWS_PER_YEAR * 10)) * DECADE_ROW_GAP;
}

export const GRID_W = MARGIN_LEFT + colX(GRID_COLS - 1) + CELL + 12;
export const GRID_H = MARGIN_TOP + rowY(GRID_ROWS - 1) + CELL + 28;

export const WEEK_TICKS = [1, 4, 7, 10, 13] as const;
export const AGE_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120] as const;

export type ZoomMode = "fit" | "now" | 1 | 1.5 | 2 | 3;

/** Map linear week index (0 … 6239) to grid row/col (13 wide, 4 rows per year). */
export function weekIndexToGridPos(weekIndex: number): { row: number; col: number } {
  const year = Math.floor(weekIndex / 52);
  const weekInYear = weekIndex % 52;
  return {
    row: year * ROWS_PER_YEAR + Math.floor(weekInYear / WEEKS_PER_ROW),
    col: weekInYear % WEEKS_PER_ROW,
  };
}

export function focusedViewBoxForWeek(currentWeekIndex: number): string {
  const currentRow = weekIndexToGridPos(currentWeekIndex).row;
  const minRow = Math.max(0, currentRow - ROWS_PER_YEAR);
  const maxRow = Math.min(GRID_ROWS - 1, currentRow + ROWS_PER_YEAR * 2);
  const y0 = MARGIN_TOP + rowY(minRow) - 14;
  const y1 = MARGIN_TOP + rowY(maxRow) + CELL + 28;
  return `0 ${y0} ${GRID_W} ${y1 - y0}`;
}

/** Apple Fitness Activity ring palette — one hue per quarter of the year */
export const FITNESS_QUARTER_COLORS = ["#FA114F", "#92E82A", "#1EEAFD", "#FF9F0A"] as const;

export function fitnessDashColor(weekCol: number): string {
  const quarter = Math.min(3, Math.floor(weekCol / 13));
  return FITNESS_QUARTER_COLORS[quarter];
}

export const POSTER_CLASS =
  "rounded-2xl border border-zinc-300/80 bg-[#f7f4ec] text-zinc-900 shadow-sm dark:border-zinc-600/80 dark:bg-[#1c1917] dark:text-zinc-100";
