import { addDaysISO, localDateISO } from "@/lib/habits/dates";

function sortedUniqueDates(dates: string[]): string[] {
  return [...new Set(dates)].sort();
}

/** Current streak ending at today (or yesterday if today unchecked). */
export function currentStreak(completionDates: string[], todayISO = localDateISO()): number {
  const set = new Set(completionDates);
  if (set.size === 0) return 0;

  let cursor = todayISO;
  if (!set.has(cursor)) {
    cursor = addDaysISO(todayISO, -1);
  }
  if (!set.has(cursor)) return 0;

  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function maxStreak(completionDates: string[]): number {
  const sorted = sortedUniqueDates(completionDates);
  if (sorted.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const expected = addDaysISO(prev, 1);
    if (cur === expected) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}
