/** Actual illustrated artwork from the approved sheet, not Lucide approximations.
 * Keep paths versioned: sidebar, home launcher and mini-phone share these assets.
 * Artwork includes its own lighting and transparent corners; do not add tile CSS.
 */
export const APP_ICON_ARTWORK = {
  overview: "/app-icons/illustrated-v1/overview.webp",
  bible: "/app-icons/illustrated-v1/bible.webp",
  journal: "/app-icons/illustrated-v1/journal.webp",
  prayer: "/app-icons/illustrated-v1/prayer.webp",
  notes: "/app-icons/illustrated-v1/notes.webp",
  "morning-formula": "/app-icons/illustrated-v1/morning-formula.webp",
  "mind-map": "/app-icons/illustrated-v1/mind-map.webp",
  artifacts: "/app-icons/illustrated-v1/artifacts.webp",
  "lumen-ai": "/app-icons/illustrated-v1/lumen-ai.webp",
  tasks: "/app-icons/illustrated-v1/tasks.webp",
  habits: "/app-icons/illustrated-v1/habits.webp",
  "vision-board": "/app-icons/illustrated-v1/vision-board.webp",
  settings: "/app-icons/illustrated-v1/settings.webp",
} as const;

export type AppIconArtworkId = keyof typeof APP_ICON_ARTWORK;

const LABEL_ARTWORK: Readonly<Record<string, AppIconArtworkId>> = {
  overview: "overview",
  bible: "bible",
  journal: "journal",
  prayer: "prayer",
  notes: "notes",
  "morning formula": "morning-formula",
  "mind map": "mind-map",
  graph: "mind-map",
  artifacts: "artifacts",
  "lumen ai": "lumen-ai",
  "lyman ai": "lumen-ai",
  "my ai": "lumen-ai",
  tasks: "tasks",
  habits: "habits",
  "vision board": "vision-board",
  settings: "settings",
  // Daily deliberately shares the sunrise. Sleep has no artwork in this sheet.
  daily: "morning-formula",
};

/** Unknown modules retain their existing fallback until an actual asset is supplied. */
export function getAppIconArtwork(label: string): string | undefined {
  const id = LABEL_ARTWORK[label.trim().toLowerCase().replace(/\s+/g, " ")];
  return id ? APP_ICON_ARTWORK[id] : undefined;
}
