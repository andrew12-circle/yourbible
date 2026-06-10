/**
 * Faith-grounded GROW letter sections — inspired by future-self journaling,
 * anchored in gratitude, discernment, and surrender (not law-of-attraction).
 */

export type LetterSectionKey =
  | "mission"
  | "gratitude"
  | "realizations"
  | "outlook"
  | "wishes"
  | "scripture"
  | "surrender";

export interface LetterSectionDef {
  key: LetterSectionKey;
  growLabel?: string;
  label: string;
  hint: string;
  placeholder: string;
  rows: number;
}

export const LETTER_SECTIONS: readonly LetterSectionDef[] = [
  {
    key: "mission",
    label: "Your mission",
    hint: "What are you here for? What kind of person do you want to become — before the goals?",
    placeholder:
      "I want my life to count for God and the people around me. Success means…",
    rows: 4,
  },
  {
    key: "gratitude",
    growLabel: "G",
    label: "Gratitude",
    hint: "What has God already done? What are you thankful for right now?",
    placeholder:
      "Dear future me — before we talk about what's ahead, here's what I'm grateful for today…",
    rows: 5,
  },
  {
    key: "realizations",
    growLabel: "R",
    label: "Realizations",
    hint: "What have you learned about yourself, God, and the season you're in?",
    placeholder:
      "The hardest lesson this season taught me was… I used to believe… now I see…",
    rows: 5,
  },
  {
    key: "outlook",
    growLabel: "O",
    label: "The vivid future",
    hint: "Write to yourself in 2 years. See it — morning light, relationships, work, peace, faith. Present tense.",
    placeholder:
      "It's two years from now. I wake up and… I feel… My family… My work… God has…",
    rows: 10,
  },
  {
    key: "wishes",
    growLabel: "W",
    label: "Wishes & goals",
    hint: "Name what you're believing God for. Big goals first — you'll break them into steps next.",
    placeholder:
      "By this time I want to have… I'm asking God for… I will steward…",
    rows: 6,
  },
  {
    key: "scripture",
    label: "Scripture anchor",
    hint: "Verses that ground this letter — promises, character of God, Jesus' teaching.",
    placeholder: "Heb 11:1 — faith is…\nRom 8:28 — …\nJer 29:11 — …",
    rows: 4,
  },
  {
    key: "surrender",
    label: "Surrender",
    hint: "Like Jesus in Gethsemane — hold your hopes open-handed. Thy will be done.",
    placeholder:
      "Father, these are my hopes. I believe You are good. Not my will, but Yours — amen.",
    rows: 4,
  },
] as const;

export const DEFAULT_TIMEFRAME_YEARS = 2;

export const TIMEFRAME_OPTIONS = [
  { years: 1, label: "1 year" },
  { years: 2, label: "2 years" },
  { years: 5, label: "5 years" },
] as const;

export const GOAL_DOMAIN_OPTIONS = [
  { key: "god" as const, label: "God", color: "amber-500" },
  { key: "health" as const, label: "Health", color: "rose-500" },
  { key: "family" as const, label: "Family", color: "sky-500" },
  { key: "work" as const, label: "Work", color: "violet-500" },
  { key: "others" as const, label: "Others", color: "emerald-500" },
];

export type GoalDomain = (typeof GOAL_DOMAIN_OPTIONS)[number]["key"];

export function defaultLetterTitle(years: number): string {
  return years === 1 ? "Letter to myself in 1 year" : `Letter to myself in ${years} years`;
}

export function computeUnlockAt(sealedAt: Date, years: number): Date {
  const d = new Date(sealedAt);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

export function formatUnlockLabel(unlockAt: string | null): string {
  if (!unlockAt) return "Not sealed yet";
  return new Date(unlockAt).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function isLetterUnlockable(unlockAt: string | null, now = new Date()): boolean {
  if (!unlockAt) return false;
  return now >= new Date(unlockAt);
}
