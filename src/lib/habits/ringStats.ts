import {
  effectiveLastDay,
  localDateISO,
  monthWeekRanges,
  parseYearMonth,
} from "@/lib/habits/dates";
import { completionKey } from "@/lib/habits/stats";

export type RingStats = {
  /** Today: habits completed / total (Move ring) */
  todayPct: number;
  todayDone: number;
  todayTotal: number;
  /** Current calendar week in month (Exercise ring) */
  weekPct: number;
  /** Month elapsed-day completion (Stand ring) */
  monthPct: number;
};

export function computeRingStats(
  habitIds: string[],
  completionSet: Set<string>,
  yearMonth: string,
  todayISO = localDateISO(),
): RingStats {
  const habitCount = habitIds.length;
  if (habitCount === 0) {
    return { todayPct: 0, todayDone: 0, todayTotal: 0, weekPct: 0, monthPct: 0 };
  }

  const { year, month } = parseYearMonth(yearMonth);
  const lastDay = effectiveLastDay(year, month, yearMonth);
  const todayDay = Number(todayISO.slice(8, 10));
  const todayInMonth =
    todayISO.startsWith(`${year}-${String(month).padStart(2, "0")}-`) && todayDay <= lastDay;

  let todayDone = 0;
  if (todayInMonth) {
    for (const habitId of habitIds) {
      if (completionSet.has(completionKey(habitId, year, month, todayDay))) todayDone += 1;
    }
  }
  const todayPct = Math.round((todayDone / habitCount) * 100);

  const weeks = monthWeekRanges(year, month);
  const currentWeek = weeks.find((w) => todayInMonth && todayDay >= w.start && todayDay <= w.end);
  let weekPct = 0;
  if (currentWeek) {
    const { start, end } = currentWeek;
    const endClamped = Math.min(end, lastDay);
    const daysInWeek = endClamped - start + 1;
    const possible = habitCount * daysInWeek;
    let done = 0;
    for (const habitId of habitIds) {
      for (let day = start; day <= endClamped; day++) {
        if (completionSet.has(completionKey(habitId, year, month, day))) done += 1;
      }
    }
    weekPct = possible > 0 ? Math.round((done / possible) * 100) : 0;
  }

  let completedCells = 0;
  for (const habitId of habitIds) {
    for (let day = 1; day <= lastDay; day++) {
      if (completionSet.has(completionKey(habitId, year, month, day))) completedCells += 1;
    }
  }
  const possibleCells = habitCount * lastDay;
  const monthPct = possibleCells > 0 ? Math.round((completedCells / possibleCells) * 100) : 0;

  return { todayPct, todayDone, todayTotal: habitCount, weekPct, monthPct };
}
