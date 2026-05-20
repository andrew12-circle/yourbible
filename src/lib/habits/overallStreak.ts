import { localDateISO } from "@/lib/habits/dates";
import { currentStreak, maxStreak } from "@/lib/habits/streaks";

/** Dates where every active habit was completed. */
export function perfectDayDates(
  habitIds: string[],
  datesByHabit: Map<string, string[]>,
): string[] {
  if (habitIds.length === 0) return [];

  const countByDate = new Map<string, number>();
  for (const habitId of habitIds) {
    for (const date of datesByHabit.get(habitId) ?? []) {
      countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
    }
  }

  const perfect: string[] = [];
  for (const [date, count] of countByDate) {
    if (count >= habitIds.length) perfect.push(date);
  }
  return perfect.sort();
}

/** Consecutive perfect days ending today (or yesterday). */
export function perfectDayStreak(
  habitIds: string[],
  datesByHabit: Map<string, string[]>,
  todayISO = localDateISO(),
): number {
  return currentStreak(perfectDayDates(habitIds, datesByHabit), todayISO);
}

/** Days with at least one habit completed. */
export function activeDayDates(datesByHabit: Map<string, string[]>): string[] {
  const set = new Set<string>();
  for (const dates of datesByHabit.values()) {
    for (const d of dates) set.add(d);
  }
  return [...set].sort();
}

export function activeDayStreak(
  datesByHabit: Map<string, string[]>,
  todayISO = localDateISO(),
): number {
  return currentStreak(activeDayDates(datesByHabit), todayISO);
}

export type TopHabitStreak = {
  habitId: string;
  name: string;
  current: number;
  max: number;
};

export function topHabitStreaks(
  habits: { id: string; name: string }[],
  datesByHabit: Map<string, string[]>,
  limit = 3,
): TopHabitStreak[] {
  return habits
    .map((h) => {
      const dates = datesByHabit.get(h.id) ?? [];
      return {
        habitId: h.id,
        name: h.name,
        current: currentStreak(dates),
        max: maxStreak(dates),
      };
    })
    .sort((a, b) => b.current - a.current || b.max - a.max)
    .slice(0, limit);
}
