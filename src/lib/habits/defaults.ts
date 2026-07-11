/** Current-season habit template — used for import and full reset. */
export const DEFAULT_HABIT_NAMES: { name: string; category?: string }[] = [
  {
    name: "Daily Alignment (worship, gratitude, Scripture, prayer)",
    category: "Abide",
  },
  { name: "Morning hygiene complete", category: "Build the temple" },
  { name: "Filled water bottle", category: "Build the temple" },
  { name: "Finished water goal", category: "Build the temple" },
  { name: "Move for 20 minutes", category: "Build the temple" },
  { name: "Ate three real meals (or equivalent nutrition)", category: "Build the temple" },
  { name: "Shutdown routine complete", category: "Build the temple" },
  { name: "In bed for next sleep block", category: "Build the temple" },
  { name: "15 minutes uninterrupted with Tish", category: "Family" },
  { name: "Read or pray with Lilly", category: "Family" },
  { name: "Held, fed, or intentionally connected with Caroline", category: "Family" },
  { name: "One deep-work session", category: "Work" },
  { name: "Cleared critical communications", category: "Work" },
];

export const SEASON_HABIT_COUNT = DEFAULT_HABIT_NAMES.length;
