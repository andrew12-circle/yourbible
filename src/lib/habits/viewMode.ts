const STORAGE_KEY = "habits-stats-expanded";

/** Whether rings, streaks, awards, and month summary are visible (default: true). */
export function readHabitsStatsExpanded(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "0";
}

export function writeHabitsStatsExpanded(expanded: boolean): void {
  localStorage.setItem(STORAGE_KEY, expanded ? "1" : "0");
}
