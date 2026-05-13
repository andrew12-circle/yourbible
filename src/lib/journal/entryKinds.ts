/** Stored on `journal_entries.entry_kind` (null = ordinary journal entry). */
export type JournalEntryKind = "dream" | "praise_report" | "testimony" | "vent" | "chat" | "listening";

/** Faith-journal kinds (shown under /journal/life). */
export type FaithJournalKind = "dream" | "praise_report" | "testimony";

/** URL segment under `/journal/life/:segment` (vent has its own top-level route). */
export type LifeJournalRouteSegment = "dream" | "praise" | "testimony";

/** Kinds excluded from main lists, the worldview mirror, and AI retrieval. */
export const PRIVATE_ENTRY_KINDS: readonly JournalEntryKind[] = ["vent"];

export function isPrivateEntryKind(kind: string | null | undefined): boolean {
  return kind === "vent";
}

export function lifeSegmentToKind(segment: string | undefined): FaithJournalKind | null {
  if (segment === "dream") return "dream";
  if (segment === "praise") return "praise_report";
  if (segment === "testimony") return "testimony";
  return null;
}

export function kindToLifeSegment(kind: JournalEntryKind): LifeJournalRouteSegment | null {
  if (kind === "dream") return "dream";
  if (kind === "praise_report") return "praise";
  if (kind === "testimony") return "testimony";
  return null;
}

export const ENTRY_KIND_META: Record<
  JournalEntryKind,
  { label: string; shortHint: string; placeholder: string; newTitleHint: string }
> = {
  dream: {
    label: "Dream",
    shortHint: "Record a dream; add symbols or feelings you want to remember.",
    placeholder: "What did you dream? What stood out — people, places, feelings?",
    newTitleHint: "Dream",
  },
  praise_report: {
    label: "Praise report",
    shortHint: "What is God doing? What are you thankful for right now?",
    placeholder: "What happened? How did God show up? What do you want to celebrate?",
    newTitleHint: "Praise",
  },
  testimony: {
    label: "Testimony",
    shortHint: "Your story with God — add a new entry whenever it grows or shifts.",
    placeholder:
      "How would you describe what God has done in your life? What changed — then and now?",
    newTitleHint: "Testimony",
  },
  vent: {
    label: "Vent",
    shortHint: "A private place to let it all out. We hear you — we don't analyze it.",
    placeholder:
      "Let it out. What are you mad about? Hurt by? Disappointed in? No editing — just say it.",
    newTitleHint: "Vent",
  },
  chat: {
    label: "Chat session",
    shortHint: "Talk with your AI as you would to a friend; the whole thread can become your entry.",
    placeholder: "Your conversation is saved as you go. End the session when you are ready to turn it into a journal entry.",
    newTitleHint: "Reflection",
  },
  listening: {
    label: "Listening",
    shortHint:
      "Catch a thought from the Spirit, then take it from thought → words → plan → interpretation.",
    placeholder:
      "What did you hear, see, or sense? Catch it before it leaves — a word, a picture, a phrase.",
    newTitleHint: "Heard",
  },
};

/** `?kind=` on `/journal/new` */
export function parseJournalEntryKindParam(raw: string | null): JournalEntryKind | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "dream") return "dream";
  if (v === "praise" || v === "praise_report") return "praise_report";
  if (v === "testimony") return "testimony";
  if (v === "vent") return "vent";
  if (v === "chat") return "chat";
  if (v === "listening" || v === "heard" || v === "discernment") return "listening";
  return null;
}

export function coerceJournalEntryKind(raw: string | null | undefined): JournalEntryKind | null {
  if (
    raw === "dream" || raw === "praise_report" || raw === "testimony" || raw === "vent" ||
    raw === "chat" || raw === "listening"
  ) {
    return raw;
  }
  return null;
}

/** Main heading on the faith-journal list cover */
export const FAITH_JOURNAL_LIST_TITLES: Record<FaithJournalKind, string> = {
  dream: "Dream journal",
  praise_report: "Praise reports",
  testimony: "Testimonies",
};
