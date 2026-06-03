/** Consecutive-day streak ending today (or yesterday if today has no entry). */
export function currentReadingStreak(activityDates: string[], todayISO = localDateISO()): number {
  const set = new Set(activityDates);
  if (set.size === 0) return 0;

  let cursor = todayISO;
  if (!set.has(cursor)) {
    cursor = addDaysISO(todayISO, -1);
  }

  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function localDateISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return localDateISO(dt);
}
