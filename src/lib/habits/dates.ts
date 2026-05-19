/** Local calendar date YYYY-MM-DD */
export function localDateISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function yearMonthFromDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}

export function addMonthsYearMonth(ym: string, delta: number): string {
  const { year, month } = parseYearMonth(ym);
  const d = new Date(year, month - 1 + delta, 1);
  return yearMonthFromDate(d);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Weekday abbrev for a calendar day in the month (Sun–Sat). */
export function weekdayShort(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3);
}

/** Inclusive day ranges for up to 5 weeks in a month (1–7, 8–14, …). */
export function monthWeekRanges(year: number, month: number): { week: number; start: number; end: number }[] {
  const total = daysInMonth(year, month);
  const ranges: { week: number; start: number; end: number }[] = [];
  let week = 1;
  for (let start = 1; start <= total; start += 7) {
    ranges.push({ week, start, end: Math.min(start + 6, total) });
    week += 1;
  }
  return ranges;
}

export function dateISOInMonth(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function isSameYearMonth(ym: string, d = new Date()): boolean {
  return ym === yearMonthFromDate(d);
}

export function addDaysISO(isoDate: string, deltaDays: number): string {
  const [y, mo, da] = isoDate.split("-").map(Number);
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + deltaDays);
  return localDateISO(dt);
}

/** Last countable day in month view (today if current month, else full month). */
export function effectiveLastDay(year: number, month: number, viewingYm: string): number {
  const total = daysInMonth(year, month);
  if (!isSameYearMonth(viewingYm)) return total;
  return Math.min(total, new Date().getDate());
}
