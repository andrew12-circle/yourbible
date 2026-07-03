import type { PrayerCategory } from "@/lib/prayer/types";

export const PRAYER_CATEGORIES: PrayerCategory[] = [
  "family",
  "business",
  "health",
  "ministry",
  "finances",
  "guidance",
  "protection",
];

export const PRAYER_CATEGORY_LABELS: Record<PrayerCategory, string> = {
  family: "Family",
  business: "Business",
  health: "Health",
  ministry: "Ministry",
  finances: "Finances",
  guidance: "Guidance",
  protection: "Protection",
};
