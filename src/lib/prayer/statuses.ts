import type { PrayerRequestStatus } from "@/lib/prayer/types";

export const PRAYER_STATUSES: PrayerRequestStatus[] = [
  "waiting",
  "in_motion",
  "partial",
  "answered",
  "different_answer",
  "closed",
];

export const PRAYER_STATUS_LABELS: Record<PrayerRequestStatus, string> = {
  waiting: "Waiting",
  in_motion: "Provision in motion",
  partial: "Partial answer",
  answered: "Answered",
  different_answer: "Different answer",
  closed: "Closed",
};

export const PRAYER_STATUS_BADGE_CLASSES: Record<PrayerRequestStatus, string> = {
  waiting: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  in_motion: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  partial: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  answered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  different_answer: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  closed: "bg-muted text-muted-foreground",
};

/** Statuses that trigger the celebration / praise-report flow. */
export const CELEBRATION_STATUSES: PrayerRequestStatus[] = ["answered", "different_answer"];
