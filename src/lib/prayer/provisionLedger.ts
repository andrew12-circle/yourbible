import type { PrayerNeedKind, PrayerPriority, PrayerRequestRow } from "@/lib/prayer/types";

export const PRAYER_PRIORITIES: PrayerPriority[] = [
  "critical",
  "required",
  "important",
  "desired",
  "long_term",
];

export const PRAYER_PRIORITY_LABELS: Record<PrayerPriority, string> = {
  critical: "Critical",
  required: "Required",
  important: "Important",
  desired: "Desired",
  long_term: "Long-term",
};

export const PRAYER_PRIORITY_BADGE_CLASSES: Record<PrayerPriority, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  required: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  important: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200",
  desired: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200",
  long_term: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
};

export const PRAYER_NEED_KINDS: PrayerNeedKind[] = [
  "need",
  "desire",
  "restoration",
  "business_goal",
];

export const PRAYER_NEED_KIND_LABELS: Record<PrayerNeedKind, string> = {
  need: "Need",
  desire: "Desire",
  restoration: "Restoration",
  business_goal: "Business goal",
};

export function remainingProvisionAmount(row: PrayerRequestRow): number | null {
  if (row.amount_requested == null) return null;
  return Math.max(0, row.amount_requested - (row.amount_provided ?? 0));
}

export function provisionSpecificityMissing(row: Pick<
  PrayerRequestRow,
  "amount_requested" | "deadline" | "purpose" | "consequence"
>): string[] {
  const missing: string[] = [];
  if (row.amount_requested == null) missing.push("amount");
  if (!row.deadline) missing.push("deadline");
  if (!row.purpose.trim()) missing.push("purpose");
  if (!row.consequence.trim()) missing.push("consequence");
  return missing;
}

export function provisionSpecificityScore(row: Pick<
  PrayerRequestRow,
  "amount_requested" | "deadline" | "purpose" | "consequence"
>): number {
  return 4 - provisionSpecificityMissing(row).length;
}
