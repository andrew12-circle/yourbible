import { isMissedDay } from "@/lib/habits/credit";
import { dateISOInMonth, daysInMonth, effectiveLastDay, parseYearMonth } from "@/lib/habits/dates";
import { completionKey } from "@/lib/habits/stats";

export type DailySummaryPoint = {
  day: number;
  pct: number | null;
  locked: boolean;
  displayLabel: string;
};

export function computeDailySummary(
  habitCount: number,
  habitIds: string[],
  creditCompletionSet: Set<string>,
  completionSet: Set<string>,
  yearMonth: string,
  now = new Date(),
): DailySummaryPoint[] {
  const { year, month } = parseYearMonth(yearMonth);
  const totalDays = daysInMonth(year, month);
  const lastEligible = effectiveLastDay(year, month, yearMonth, now);

  const points: DailySummaryPoint[] = [];
  for (let day = 1; day <= totalDays; day++) {
    if (day > lastEligible) {
      points.push({ day, pct: null, locked: true, displayLabel: "" });
      continue;
    }

    const iso = dateISOInMonth(year, month, day);
    let credited = 0;
    let marked = false;
    for (const habitId of habitIds) {
      const key = completionKey(habitId, year, month, day);
      if (creditCompletionSet.has(key)) credited += 1;
      if (completionSet.has(key)) marked = true;
    }

    const pct =
      habitCount === 0
        ? 0
        : Math.round((credited / habitCount) * 100);

    // Missed days with no credit still chart as 0%.
    if (!marked && isMissedDay(iso, marked, now) && credited === 0) {
      points.push({ day, pct: 0, locked: false, displayLabel: "0%" });
      continue;
    }

    points.push({
      day,
      pct,
      locked: false,
      displayLabel: `${pct}%`,
    });
  }

  return points;
}
