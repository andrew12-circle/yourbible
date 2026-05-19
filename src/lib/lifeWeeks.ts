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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const WEEKS_PER_YEAR = 52;
export const DEFAULT_RETIREMENT_AGE = 65;
export const DEFAULT_COLLEGE_START_AGE = 18;
export const DEFAULT_COLLEGE_END_AGE = 22;
export const ADULT_CONTROL_AGE = 18;

export type LifeWeeksSettings = {
  retirementAge?: number;
  collegeStartAge?: number;
  collegeEndAge?: number;
  /** Optional `YYYY-MM-DD` overrides age-based college window */
  collegeStartDate?: string | null;
  collegeEndDate?: string | null;
};

export type LifePhaseStats = {
  weeksLived: number;
  weeksRemaining: number;
  pctOfLifespan: number;
  /** Weeks from age 18 onward (excludes childhood) */
  controlWeeksLived: number;
  collegeWeeksLived: number;
  collegeWeeksTotal: number;
  workingWeeksLived: number;
  weeksUntilRetirement: number;
  /** Post-retirement weeks still ahead on the 120-year grid */
  enjoyWeeksRemaining: number;
};

function ageToWeekIndex(ageYears: number): number {
  return ageYears * WEEKS_PER_YEAR;
}

/** Week index from birth (week 0 = birth week) to the ISO week containing `targetIso`. */
export function weekIndexFromBirth(birthIsoDate: string, targetIso: string): number | null {
  const birthDay = parseBirthDate(birthIsoDate);
  const targetDay = parseUtcDateOnly(targetIso.trim());
  if (birthDay === null || targetDay === null) return null;
  const birthWeekMonday = utcMondayOfWeekContaining(birthDay);
  const targetWeekMonday = utcMondayOfWeekContaining(targetDay);
  const diff = Math.round((targetWeekMonday - birthWeekMonday) / WEEK_MS);
  return diff < 0 ? null : Math.min(LIFE_WEEKS_TOTAL - 1, diff);
}

export const DEFAULT_LIFE_WEEKS_SETTINGS: Required<
  Pick<LifeWeeksSettings, "retirementAge" | "collegeStartAge" | "collegeEndAge">
> = {
  retirementAge: DEFAULT_RETIREMENT_AGE,
  collegeStartAge: DEFAULT_COLLEGE_START_AGE,
  collegeEndAge: DEFAULT_COLLEGE_END_AGE,
};

export function parseLifeWeeksSettingsFromLayout(layoutJson: string | null | undefined): LifeWeeksSettings {
  if (!layoutJson?.trim()) return {};
  try {
    const parsed = JSON.parse(layoutJson) as { lifeWeeks?: LifeWeeksSettings };
    return parsed?.lifeWeeks && typeof parsed.lifeWeeks === "object" ? parsed.lifeWeeks : {};
  } catch {
    return {};
  }
}

export function mergeLifeWeeksSettings(raw: LifeWeeksSettings | undefined): Required<
  Pick<LifeWeeksSettings, "retirementAge" | "collegeStartAge" | "collegeEndAge">
> & {
  collegeStartDate: string | null;
  collegeEndDate: string | null;
} {
  const retirementAge =
    typeof raw?.retirementAge === "number" && raw.retirementAge > ADULT_CONTROL_AGE && raw.retirementAge <= 120
      ? Math.round(raw.retirementAge)
      : DEFAULT_RETIREMENT_AGE;
  const collegeStartAge =
    typeof raw?.collegeStartAge === "number" && raw.collegeStartAge >= 0 && raw.collegeStartAge < 120
      ? Math.round(raw.collegeStartAge)
      : DEFAULT_COLLEGE_START_AGE;
  let collegeEndAge =
    typeof raw?.collegeEndAge === "number" && raw.collegeEndAge > collegeStartAge && raw.collegeEndAge <= 120
      ? Math.round(raw.collegeEndAge)
      : DEFAULT_COLLEGE_END_AGE;
  if (collegeEndAge <= collegeStartAge) collegeEndAge = collegeStartAge + 4;

  const collegeStartDate =
    raw?.collegeStartDate && parseUtcDateOnly(String(raw.collegeStartDate).trim()) !== null
      ? String(raw.collegeStartDate).trim().slice(0, 10)
      : null;
  const collegeEndDate =
    raw?.collegeEndDate && parseUtcDateOnly(String(raw.collegeEndDate).trim()) !== null
      ? String(raw.collegeEndDate).trim().slice(0, 10)
      : null;

  return { retirementAge, collegeStartAge, collegeEndAge, collegeStartDate, collegeEndDate };
}

/**
 * Life-stage breakdown for the poster stats bar.
 * College window uses profile dates when set, otherwise ages 18–22.
 */
export function computeLifePhaseStats(
  birthIsoDate: string,
  nowMs: number = Date.now(),
  settings: LifeWeeksSettings = {},
): LifePhaseStats | null {
  const index = computeLifeWeekIndex(birthIsoDate, nowMs);
  if (!index) return null;

  const merged = mergeLifeWeeksSettings(settings);
  const weeksLived = index.currentWeekIndex + 1;
  const weeksRemaining = Math.max(0, LIFE_WEEKS_TOTAL - weeksLived);
  const pctOfLifespan = (100 * weeksLived) / LIFE_WEEKS_TOTAL;

  const controlStart = ageToWeekIndex(ADULT_CONTROL_AGE);
  const controlWeeksLived = Math.max(0, weeksLived - controlStart);

  let collegeStartWeek = ageToWeekIndex(merged.collegeStartAge);
  let collegeEndWeek = ageToWeekIndex(merged.collegeEndAge);
  if (merged.collegeStartDate) {
    const w = weekIndexFromBirth(birthIsoDate, merged.collegeStartDate);
    if (w !== null) collegeStartWeek = w;
  }
  if (merged.collegeEndDate) {
    const w = weekIndexFromBirth(birthIsoDate, merged.collegeEndDate);
    if (w !== null) collegeEndWeek = w + 1;
  }
  if (collegeEndWeek <= collegeStartWeek) collegeEndWeek = collegeStartWeek + ageToWeekIndex(4);

  const collegeWeeksTotal = Math.max(0, collegeEndWeek - collegeStartWeek);
  const collegeWeeksLived = Math.max(0, Math.min(weeksLived, collegeEndWeek) - collegeStartWeek);

  const workingStartWeek = collegeEndWeek;
  const retirementWeek = ageToWeekIndex(merged.retirementAge);
  const workingWeeksLived = Math.max(
    0,
    Math.min(weeksLived, retirementWeek) - Math.min(weeksLived, workingStartWeek),
  );
  const weeksUntilRetirement =
    weeksLived < retirementWeek ? Math.max(0, retirementWeek - weeksLived) : 0;
  const enjoyWeeksRemaining =
    weeksLived < LIFE_WEEKS_TOTAL
      ? Math.max(0, LIFE_WEEKS_TOTAL - Math.max(weeksLived, retirementWeek))
      : 0;

  return {
    weeksLived,
    weeksRemaining,
    pctOfLifespan,
    controlWeeksLived,
    collegeWeeksLived,
    collegeWeeksTotal,
    workingWeeksLived,
    weeksUntilRetirement,
    enjoyWeeksRemaining,
  };
}

/** Merge `lifeWeeks` patch into existing profile.layout JSON string. */
export function patchLayoutWithLifeWeeksSettings(
  layoutJson: string,
  lifeWeeksPatch: LifeWeeksSettings,
): string {
  let root: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(layoutJson || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) root = parsed as Record<string, unknown>;
  } catch {
    root = {};
  }
  const prev =
    root.lifeWeeks && typeof root.lifeWeeks === "object" && !Array.isArray(root.lifeWeeks)
      ? (root.lifeWeeks as Record<string, unknown>)
      : {};
  root.lifeWeeks = { ...prev, ...lifeWeeksPatch };
  return JSON.stringify(root);
}
