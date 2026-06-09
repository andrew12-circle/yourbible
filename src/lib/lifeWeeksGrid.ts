/** SVG layout constants and helpers for the 120×52 life-weeks grid. */

export const CELL = 12;
export const GAP = 2;
export const COL_GROUP_GAP = 3;
export const DECADE_ROW_GAP = 6;
export const MARGIN_TOP = 32;
export const MARGIN_LEFT = 36;
export const LABEL_SIZE = 11;

export function colX(c: number): number {
  return c * (CELL + GAP) + Math.floor(c / 5) * COL_GROUP_GAP;
}

export function rowY(r: number): number {
  return r * (CELL + GAP) + Math.floor(r / 10) * DECADE_ROW_GAP;
}

export const GRID_W = MARGIN_LEFT + colX(51) + CELL + 12;
export const GRID_H = MARGIN_TOP + rowY(119) + CELL + 28;

export const WEEK_TICKS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 52] as const;
export const AGE_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120] as const;

export type ZoomMode = "fit" | "now" | 1 | 1.5 | 2 | 3;

export function focusedViewBoxForWeek(currentWeekIndex: number): string {
  const currentRow = Math.floor(currentWeekIndex / 52);
  const minRow = Math.max(0, currentRow - 2);
  const maxRow = Math.min(119, currentRow + 5);
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
