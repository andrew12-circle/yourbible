/** SVG layout: 52 week-columns × 120 year-rows; 13 visual sections (4 cols each). */



export const CELL = 10;

export const GAP = 2;

export const COL_GROUP_GAP = 4;

export const DECADE_ROW_GAP = 8;

export const MARGIN_TOP = 32;

export const MARGIN_LEFT = 36;

export const LABEL_SIZE = 10;



/** Micro-cells inside one section column. */

export const SECTION_COLS = 4;

export const SECTION_ROWS = 10;

/** Sections across the chart (13 × 4 = 52 week-columns). */

export const SECTIONS_ACROSS = 13;

export const GRID_COLS = 52;

export const GRID_ROWS = 120;



export function sectionX(sectionIndex: number): number {

  return sectionIndex * (SECTION_COLS * (CELL + GAP) + COL_GROUP_GAP);

}



export function colX(col: number): number {

  const section = Math.floor(col / SECTION_COLS);

  const within = col % SECTION_COLS;

  return sectionX(section) + within * (CELL + GAP);

}



export function bandY(bandIndex: number): number {

  return bandIndex * (SECTION_ROWS * (CELL + GAP) + DECADE_ROW_GAP);

}



export function rowY(row: number): number {

  const band = Math.floor(row / SECTION_ROWS);

  const within = row % SECTION_ROWS;

  return bandY(band) + within * (CELL + GAP);

}



export function sectionWidthPx(): number {

  return SECTION_COLS * (CELL + GAP) - GAP;

}



export function gridHeightPx(): number {

  return rowY(GRID_ROWS - 1) + CELL;

}



export const GRID_W = MARGIN_LEFT + colX(GRID_COLS - 1) + CELL + 12;

export const GRID_H = MARGIN_TOP + gridHeightPx() + 28;



/** Section numbers 1–13 across the top. */

export const SECTION_TICKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

export const AGE_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120] as const;



export type ZoomMode = "fit" | "now" | 1 | 1.5 | 2 | 3;



/**

 * Map week index (0 … 6239) to micro-cell row/col.

 * One row per year; weeks fill left-to-right across 52 columns.

 */

export function weekIndexToGridPos(weekIndex: number): { row: number; col: number } {

  return {

    row: Math.floor(weekIndex / GRID_COLS),

    col: weekIndex % GRID_COLS,

  };

}



export function focusedViewBoxForWeek(currentWeekIndex: number): string {

  const currentRow = weekIndexToGridPos(currentWeekIndex).row;

  const minRow = Math.max(0, currentRow - SECTION_ROWS);

  const maxRow = Math.min(GRID_ROWS - 1, currentRow + SECTION_ROWS);

  const y0 = MARGIN_TOP + rowY(minRow) - 14;

  const y1 = MARGIN_TOP + rowY(maxRow) + CELL + 28;

  return `0 ${y0} ${GRID_W} ${y1 - y0}`;

}



/** Compact viewport centered on a week cell (weekly review dialog snippet). */

export function reviewSnippetViewBox(weekIndex: number): string {

  const { row, col } = weekIndexToGridPos(weekIndex);

  const padRows = 2;

  const padCols = 8;

  const minRow = Math.max(0, row - padRows);

  const maxRow = Math.min(GRID_ROWS - 1, row + padRows);

  const minCol = Math.max(0, col - padCols);

  const maxCol = Math.min(GRID_COLS - 1, col + padCols);

  const x0 = MARGIN_LEFT + colX(minCol) - 10;

  const y0 = MARGIN_TOP + rowY(minRow) - 10;

  const x1 = MARGIN_LEFT + colX(maxCol) + CELL + 10;

  const y1 = MARGIN_TOP + rowY(maxRow) + CELL + 10;

  return `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;

}



/** Apple Fitness Activity ring palette — one hue per quarter of the year */

export const FITNESS_QUARTER_COLORS = ["#FA114F", "#92E82A", "#1EEAFD", "#FF9F0A"] as const;



export function fitnessDashColor(weekCol: number): string {

  const quarter = Math.min(3, Math.floor(weekCol / 13));

  return FITNESS_QUARTER_COLORS[quarter];

}



export const POSTER_CLASS =

  "rounded-2xl border border-zinc-300/80 bg-[#f7f4ec] text-zinc-900 shadow-sm dark:border-zinc-600/80 dark:bg-[#1c1917] dark:text-zinc-100";


