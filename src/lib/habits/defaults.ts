/** Current-season habit template — used for import and full reset. */
export const DEFAULT_HABIT_NAMES: { name: string; category?: string }[] = [
  {
    name: "Daily Alignment (worship, gratitude, Scripture, prayer)",
    category: "Daily Alignment",
  },
  { name: "Morning hygiene complete", category: "Body" },
  { name: "Filled water bottle", category: "Body" },
  { name: "Finished water goal", category: "Body" },
  { name: "Move for 20 minutes", category: "Body" },
  { name: "Ate three real meals (or equivalent nutrition)", category: "Body" },
  { name: "15 minutes uninterrupted with Tish", category: "Family" },
  { name: "Read or pray with Lilly", category: "Family" },
  { name: "Held, fed, or intentionally connected with Caroline", category: "Family" },
  { name: "One deep-work session", category: "Business" },
  { name: "Cleared critical communications", category: "Business" },
  { name: "Shutdown routine complete", category: "Evening" },
  { name: "In bed for next sleep block", category: "Evening" },
];

export const SEASON_HABIT_COUNT = DEFAULT_HABIT_NAMES.length;
