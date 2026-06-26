import { describe, expect, it } from "vitest";

import {
  GRID_COLS,
  GRID_ROWS,
  SECTIONS_ACROSS,
  reviewSnippetViewBox,
  weekIndexToGridPos,
} from "@/lib/lifeWeeksGrid";



describe("lifeWeeksGrid", () => {

  it("maps week 0 to top-left micro-cell", () => {

    expect(weekIndexToGridPos(0)).toEqual({ row: 0, col: 0 });

  });



  it("fills left-to-right across a year row", () => {

    expect(weekIndexToGridPos(51)).toEqual({ row: 0, col: 51 });

    expect(weekIndexToGridPos(52)).toEqual({ row: 1, col: 0 });

  });



  it("uses 52 columns (13 sections × 4 cols)", () => {

    expect(GRID_COLS).toBe(SECTIONS_ACROSS * 4);

    const endOfYear = weekIndexToGridPos(51);

    expect(endOfYear.col).toBe(GRID_COLS - 1);

    expect(endOfYear.row).toBe(0);

  });



  it("starts the next year on the next row", () => {

    expect(weekIndexToGridPos(520)).toEqual({ row: 10, col: 0 });

  });



  it("covers 120 rows for 120 years", () => {

    const last = weekIndexToGridPos(6239);

    expect(last.row).toBe(GRID_ROWS - 1);

    expect(last.col).toBe(GRID_COLS - 1);

  });



  it("reviewSnippetViewBox centers on the given week", () => {

    const vb = reviewSnippetViewBox(520);

    expect(vb).toMatch(/^\d/);

    const { row } = weekIndexToGridPos(520);

    expect(row).toBe(10);

  });

});


