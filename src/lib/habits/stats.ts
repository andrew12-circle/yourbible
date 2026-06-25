import {
  dateISOInMonth,
  daysInMonth,
  effectiveLastDay,
  monthWeekRanges,
  parseYearMonth,
} from "@/lib/habits/dates";
import { countsForCredit } from "@/lib/habits/credit";

export type MonthStats = {
  /** Overall completion % for elapsed days in month */
  activeDaysPct: number;
  /** Per-category rollup (habits grouped by category label) */
  categoryPct: Record<string, number>;
  /** Weekly done % keyed by week number 1..5 */
  weeklyPct: Record<number, number>;
  completedCells: number;
  possibleCells: number;
};

export function computeMonthStats(
  habitCount: number,
  completionsInMonth: Set<string>,
  categoriesByHabit: Map<string, string | null>,
  habitIds: string[],
  yearMonth: string,
): MonthStats {
  const { year, month } = parseYearMonth(yearMonth);
  const lastDay = effectiveLastDay(year, month, yearMonth);
  const habitIdSet = new Set(habitIds);

  let completedCells = 0;
  for (const key of completionsInMonth) {
    const [habitId, dayStr] = key.split("|");
    if (!habitIdSet.has(habitId!)) continue;
    const day = Number(dayStr);
    if (day >= 1 && day <= lastDay) completedCells += 1;
  }

  const possibleCells = habitCount * lastDay;
  const activeDaysPct = possibleCells > 0 ? Math.round((completedCells / possibleCells) * 100) : 0;

  const categoryTotals = new Map<string, { done: number; possible: number }>();
  for (const habitId of habitIds) {
    const cat = categoriesByHabit.get(habitId) ?? "General";
    const entry = categoryTotals.get(cat) ?? { done: 0, possible: lastDay };
    entry.possible += lastDay;
    categoryTotals.set(cat, entry);
  }
  for (const key of completionsInMonth) {
    const [habitId, dayStr] = key.split("|");
    if (!habitId || !habitIdSet.has(habitId)) continue;
    const day = Number(dayStr);
    if (day < 1 || day > lastDay) continue;
    const cat = categoriesByHabit.get(habitId) ?? "General";
    const entry = categoryTotals.get(cat)!;
    entry.done += 1;
  }

  const categoryPct: Record<string, number> = {};
  for (const [cat, { done, possible }] of categoryTotals) {
    categoryPct[cat] = possible > 0 ? Math.round((done / possible) * 100) : 0;
  }

  const weeklyPct: Record<number, number> = {};
  const weeks = monthWeekRanges(year, month);
  for (const { week, start, end } of weeks) {
    const endClamped = Math.min(end, lastDay);
    if (start > lastDay) {
      weeklyPct[week] = 0;
      continue;
    }
    const daysInWeek = endClamped - start + 1;
    const possible = habitCount * daysInWeek;
    let done = 0;
    for (const key of completionsInMonth) {
      const [habitId, dayStr] = key.split("|");
      if (!habitId || !habitIdSet.has(habitId)) continue;
      const day = Number(dayStr);
      if (day >= start && day <= endClamped) done += 1;
    }
    weeklyPct[week] = possible > 0 ? Math.round((done / possible) * 100) : 0;
  }

  const blendedCategory =
    Object.values(categoryPct).length > 0
      ? Math.round(Object.values(categoryPct).reduce((a, b) => a + b, 0) / Object.values(categoryPct).length)
      : activeDaysPct;

  return {
    activeDaysPct,
    categoryPct: { ...categoryPct, "All habits": blendedCategory },
    weeklyPct,
    completedCells,
    possibleCells,
  };
}

export function completionKey(habitId: string, year: number, month: number, day: number): string {
  return `${habitId}|${day}`;
}

export function buildCompletionSet(
  rows: { habit_id: string; completion_date: string }[],
  yearMonth: string,
): Set<string> {
  return buildCompletionSets(rows, yearMonth).all;
}

export function buildCompletionSets(
  rows: { habit_id: string; completion_date: string; created_at?: string }[],
  yearMonth: string,
): { all: Set<string>; credit: Set<string> } {
  const { year, month } = parseYearMonth(yearMonth);
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const all = new Set<string>();
  const credit = new Set<string>();
  for (const row of rows) {
    if (!row.completion_date.startsWith(prefix)) continue;
    const day = Number(row.completion_date.slice(8, 10));
    const key = completionKey(row.habit_id, year, month, day);
    all.add(key);
    if (row.created_at && countsForCredit(row.completion_date, row.created_at)) {
      credit.add(key);
    }
  }
  return { all, credit };
}

export function isoForDay(year: number, month: number, day: number): string {
  return dateISOInMonth(year, month, day);
}

export function daysInMonthForYm(yearMonth: string): number {
  const { year, month } = parseYearMonth(yearMonth);
  return daysInMonth(year, month);
}
