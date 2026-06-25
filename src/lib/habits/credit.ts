const CREDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Local midnight at the start of the day after `completionDate` (YYYY-MM-DD). */
export function dayAfter(completionDate: string): Date {
  const [y, mo, da] = completionDate.split("-").map(Number);
  return new Date(y, mo - 1, da + 1, 0, 0, 0, 0);
}

/** Last moment a check-in still earns streak / ring / award credit. */
export function creditDeadlineForDay(completionDate: string): Date {
  return new Date(dayAfter(completionDate).getTime() + CREDIT_WINDOW_MS);
}

export function isCreditWindowOpen(completionDate: string, now = new Date()): boolean {
  return now.getTime() <= creditDeadlineForDay(completionDate).getTime();
}

export function countsForCredit(completionDate: string, createdAt: string): boolean {
  const markedAt = new Date(createdAt);
  if (Number.isNaN(markedAt.getTime())) return false;
  return markedAt.getTime() <= creditDeadlineForDay(completionDate).getTime();
}

/** Past days with no mark after the credit window closed. */
export function isMissedDay(completionDate: string, isMarked: boolean, now = new Date()): boolean {
  if (isMarked) return false;
  return now.getTime() > creditDeadlineForDay(completionDate).getTime();
}
