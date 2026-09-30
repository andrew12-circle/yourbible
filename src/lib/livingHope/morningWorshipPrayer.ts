export type WorshipMode = "sing" | "tongues" | "both";
export const TONGUES_MINUTES = [1, 3, 5, 10] as const;
export interface WorshipPrayerTimer {
  targetMs: number;
  remainingMs: number;
  startedAt: number | null;
  hasStarted: boolean;
  prayedToday: boolean;
}
export function parseWorshipMode(value: unknown): WorshipMode {
  return value === "sing" || value === "tongues" ? value : "both";
}
export function parseTonguesMinutes(value: unknown): number {
  return TONGUES_MINUTES.some((minutes) => minutes === value) ? Number(value) : 5;
}
export function emptyWorshipPrayerTimer(minutes = 5): WorshipPrayerTimer {
  const targetMs = parseTonguesMinutes(minutes) * 60_000;
  return { targetMs, remainingMs: targetMs, startedAt: null, hasStarted: false, prayedToday: false };
}
export function parseWorshipPrayerTimer(value: unknown): WorshipPrayerTimer {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyWorshipPrayerTimer();
  const raw = value as Record<string, unknown>;
  const targetMs = typeof raw.targetMs === "number" && Number.isFinite(raw.targetMs) ? Math.max(0, Math.min(600_000, raw.targetMs)) : 300_000;
  return { targetMs, remainingMs: typeof raw.remainingMs === "number" && Number.isFinite(raw.remainingMs) ? Math.max(0, Math.min(targetMs, raw.remainingMs)) : targetMs,
    startedAt: typeof raw.startedAt === "number" && Number.isFinite(raw.startedAt) && raw.startedAt > 0 ? raw.startedAt : null,
    hasStarted: raw.hasStarted === true, prayedToday: raw.prayedToday === true };
}
export function worshipPrayerRemaining(timer: WorshipPrayerTimer, now = Date.now()): number {
  return Math.max(0, timer.remainingMs - (timer.startedAt == null ? 0 : Math.max(0, now - timer.startedAt)));
}
export function pauseWorshipPrayer(timer: WorshipPrayerTimer, now = Date.now()): WorshipPrayerTimer {
  return { ...timer, remainingMs: worshipPrayerRemaining(timer, now), startedAt: null };
}
/** No silent shortening, budget extension, or assertion that the user prayed. */
export function startWorshipPrayer(timer: WorshipPrayerTimer, availableMs: number, now = Date.now()): WorshipPrayerTimer {
  const paused = pauseWorshipPrayer(timer, now);
  if (paused.remainingMs <= 0 || paused.remainingMs > Math.max(0, availableMs)) return paused;
  return { ...paused, startedAt: now, hasStarted: true };
}
export function startRemainingWorshipPrayer(timer: WorshipPrayerTimer, availableMs: number, now = Date.now()): WorshipPrayerTimer {
  const remainingMs = Math.max(0, Math.min(600_000, Math.floor(availableMs / 1000) * 1000));
  return { ...timer, targetMs: remainingMs, remainingMs, startedAt: remainingMs > 0 ? now : null, hasStarted: remainingMs > 0 };
}
