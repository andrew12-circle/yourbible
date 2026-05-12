/**
 * Life-in-weeks: `YYYY-MM-DD` is the civil birth date; we anchor weeks to **UTC Monday 00:00**
 * of the ISO week that contains that calendar instant (`Date.UTC` on the date parts).
 * "Today" uses the same UTC-week rule so the highlighted cell does not drift with local offsets.
 */

export const LIFE_WEEKS_TOTAL = 120 * 52; // 6,240

/** Parse YYYY-MM-DD to UTC midnight on that calendar day. */
export function parseUtcDateOnly(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return t;
}

/**
 * Birth date from DB or API: strict `YYYY-MM-DD` or ISO strings (`1990-01-15T00:00:00.000Z`).
 * Returns UTC ms for the calendar day or null — never throws.
 */
export function parseBirthDate(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const direct = parseUtcDateOnly(s);
  if (direct !== null) return direct;
  const prefix = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (!prefix) return null;
  return parseUtcDateOnly(prefix[1]);
}

/** Monday 00:00 UTC of the ISO week containing `utcMs` (any instant in that week). */
export function utcMondayOfWeekContaining(utcMs: number): number {
  const d = new Date(utcMs);
  const dow = d.getUTCDay(); // 0 Sun … 6 Sat
  const daysFromMonday = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export type LifeWeekIndexResult = {
  /** 0-based index of the current (ongoing) week of life in [0 .. LIFE_WEEKS_TOTAL-1]. */
  currentWeekIndex: number;
  /** Mondays aligned to UTC ISO weeks, ms since epoch */
  birthWeekMonday: number;
  currentWeekMonday: number;
};

/**
 * Maps "today" and birth date to a linear week index in the 6,240-week grid.
 * Birth week is index 0.
 */
export function computeLifeWeekIndex(
  birthIsoDate: string,
  nowMs: number = Date.now(),
): LifeWeekIndexResult | null {
  const birthDay = parseBirthDate(birthIsoDate);
  if (birthDay === null) return null;
  const birthWeekMonday = utcMondayOfWeekContaining(birthDay);
  const currentWeekMonday = utcMondayOfWeekContaining(nowMs);
  const diffWeeks = Math.round((currentWeekMonday - birthWeekMonday) / (7 * 24 * 60 * 60 * 1000));
  if (diffWeeks < 0) return null;
  const currentWeekIndex = Math.min(LIFE_WEEKS_TOTAL - 1, diffWeeks);
  return { currentWeekIndex, birthWeekMonday, currentWeekMonday };
}

export function formatBirthDateForInput(iso: string | null | undefined): string {
  if (iso == null) return "";
  const s = String(iso).trim();
  if (!s) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (!m || parseUtcDateOnly(m[1]) === null) return "";
  return m[1];
}
