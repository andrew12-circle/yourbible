import type { PrayerRequestRow } from "@/lib/prayer/types";

export type PrayerStats = {
  total: number;
  answered: number;
  waiting: number;
  partial: number;
  differentAnswer: number;
  closed: number;
  answerRate: number | null;
  averageWaitDays: number | null;
  longestWaitDays: number | null;
  longestWaitHuman: string | null;
};

function daysBetween(startISO: string, endISO: string): number {
  const start = new Date(`${startISO}T12:00:00`);
  const end = new Date(`${endISO}T12:00:00`);
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function humanizeWaitDays(days: number): string {
  if (days < 1) return "Same day";
  if (days < 60) return `${days} day${days === 1 ? "" : "s"}`;

  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remDays = days % 30;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  if (parts.length === 0 && remDays > 0) parts.push(`${remDays} day${remDays === 1 ? "" : "s"}`);
  return parts.join(", ");
}

export function computeWaitDays(request: Pick<PrayerRequestRow, "requested_at" | "answered_at">): number | null {
  if (!request.answered_at) return null;
  return daysBetween(request.requested_at, request.answered_at);
}

export function computePrayerStats(requests: PrayerRequestRow[]): PrayerStats {
  const total = requests.length;
  const answered = requests.filter((r) => r.status === "answered").length;
  const waiting = requests.filter((r) => r.status === "waiting").length;
  const partial = requests.filter((r) => r.status === "partial").length;
  const differentAnswer = requests.filter((r) => r.status === "different_answer").length;
  const closed = requests.filter((r) => r.status === "closed").length;

  const resolved = requests.filter(
    (r) => r.answered_at && (r.status === "answered" || r.status === "different_answer" || r.status === "partial"),
  );
  const waitDays = resolved
    .map((r) => computeWaitDays(r))
    .filter((d): d is number => d != null);

  const averageWaitDays =
    waitDays.length > 0 ? Math.round(waitDays.reduce((a, b) => a + b, 0) / waitDays.length) : null;
  const longestWaitDays = waitDays.length > 0 ? Math.max(...waitDays) : null;

  const countable = answered + differentAnswer + partial;
  const answerRate = total > 0 ? Math.round((countable / total) * 100) : null;

  return {
    total,
    answered,
    waiting,
    partial,
    differentAnswer,
    closed,
    answerRate,
    averageWaitDays,
    longestWaitDays,
    longestWaitHuman: longestWaitDays != null ? humanizeWaitDays(longestWaitDays) : null,
  };
}

export function filterRequestsByPeriod(
  requests: PrayerRequestRow[],
  period: "month" | "year" | "lifetime",
  now = new Date(),
): PrayerRequestRow[] {
  if (period === "lifetime") return requests;

  const y = now.getFullYear();
  const m = now.getMonth();

  return requests.filter((r) => {
    const dateStr = r.answered_at ?? r.requested_at;
    const d = new Date(`${dateStr}T12:00:00`);
    if (period === "year") return d.getFullYear() === y;
    return d.getFullYear() === y && d.getMonth() === m;
  });
}

export function formatDisplayDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}
