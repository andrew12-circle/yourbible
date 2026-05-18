/** Distinct calendar days with at least one entry (YYYY-MM-DD). */
export function entryDateKeys(entryTimestamps: string[]): Set<string> {
  const keys = new Set<string>();
  for (const ts of entryTimestamps) {
    if (!ts) continue;
    keys.add(ts.slice(0, 10));
  }
  return keys;
}

/** Consecutive-day streak ending today (0 if no entry today). */
export function computeWritingStreak(dateKeys: Set<string>): number {
  if (!dateKeys.size) return 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let streak = 0;
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (!dateKeys.has(key)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function formatJournalYearRange(entryTimestamps: string[]): string | null {
  if (!entryTimestamps.length) return null;
  const years = entryTimestamps
    .map((ts) => new Date(ts).getFullYear())
    .filter((y) => !Number.isNaN(y));
  if (!years.length) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min} – ${max}`;
}

export interface JournalOverviewStats {
  entryCount: number;
  mediaCount: number;
  dayCount: number;
  streak: number;
  yearRange: string | null;
}

export function buildJournalOverviewStats(
  entryTimestamps: string[],
  mediaCount: number,
): JournalOverviewStats {
  const dateKeys = entryDateKeys(entryTimestamps);
  return {
    entryCount: entryTimestamps.length,
    mediaCount,
    dayCount: dateKeys.size,
    streak: computeWritingStreak(dateKeys),
    yearRange: formatJournalYearRange(entryTimestamps),
  };
}
