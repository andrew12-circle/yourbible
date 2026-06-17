import type { JournalEntryKind } from "@/lib/journal/entryKinds";
import { normalizeInlineTag, type JournalNameRow } from "@/lib/journal/inlineMarkers";

export type HashtagMarkerSuggestion = {
  tag: string;
  label: string;
  hint?: string;
  entryKind?: JournalEntryKind;
};

export type JournalMentionSuggestion = {
  name: string;
  hint?: string;
  entryKind?: JournalEntryKind;
};

/** Always-available `#` categories while journaling. */
export const HASHTAG_MARKER_SUGGESTIONS: HashtagMarkerSuggestion[] = [
  {
    tag: "praisereport",
    label: "Praise report",
    hint: "Shows under Faith → Praise reports",
    entryKind: "praise_report",
  },
  {
    tag: "hard-question",
    label: "Hard question",
    hint: "Tags for Framework → Hard questions",
  },
  {
    tag: "ask-god",
    label: "Ask God question",
    hint: "Questions you want to bring to God",
  },
  {
    tag: "dream",
    label: "Dream",
    hint: "Shows under Faith → Dream journal",
    entryKind: "dream",
  },
  {
    tag: "testimony",
    label: "Testimony",
    hint: "Shows under Faith → Testimonies",
    entryKind: "testimony",
  },
];

/** Suggested `@` mentions (merged with the user's journals in autocomplete). */
export const JOURNAL_MENTION_SUGGESTIONS: JournalMentionSuggestion[] = [
  { name: "Questions for God", hint: "Ask God questions" },
  {
    name: "Praise report",
    hint: "Celebrate what God is doing",
    entryKind: "praise_report",
  },
  { name: "Hard questions", hint: "Research a hard question" },
];

export function entryKindForHashtag(tag: string): JournalEntryKind | null {
  const normalized = normalizeInlineTag(tag);
  return HASHTAG_MARKER_SUGGESTIONS.find((s) => s.tag === normalized)?.entryKind ?? null;
}

export function entryKindForJournalMention(name: string): JournalEntryKind | null {
  const key = name.trim().toLowerCase();
  return (
    JOURNAL_MENTION_SUGGESTIONS.find((s) => s.name.trim().toLowerCase() === key)?.entryKind ?? null
  );
}

export function filterHashtagMarkerSuggestions(
  query: string,
  knownTags: string[],
  limit = 8,
): HashtagMarkerSuggestion[] {
  const q = normalizeInlineTag(query);
  const builtinByTag = new Map(HASHTAG_MARKER_SUGGESTIONS.map((s) => [s.tag, s]));
  for (const t of knownTags) {
    const tag = normalizeInlineTag(t);
    if (!tag || builtinByTag.has(tag)) continue;
    builtinByTag.set(tag, { tag, label: tag });
  }

  let pool = [...builtinByTag.values()];
  if (q) {
    pool = pool.filter(
      (s) => s.tag.includes(q) || s.label.toLowerCase().includes(q.replace(/-/g, " ")),
    );
    if (pool.length === 0 && q.length >= 2) {
      pool.unshift({ tag: q, label: q });
    }
  }

  return pool.slice(0, limit);
}

export function filterJournalMarkerSuggestions(
  query: string,
  journals: JournalNameRow[],
  limit = 8,
): { id: string; name: string; hint?: string; entryKind?: JournalEntryKind }[] {
  const q = query.trim().toLowerCase();
  const byKey = new Map<string, { id: string; name: string; hint?: string; entryKind?: JournalEntryKind }>();

  for (const s of JOURNAL_MENTION_SUGGESTIONS) {
    byKey.set(s.name.toLowerCase(), {
      id: `builtin:${s.name}`,
      name: s.name,
      hint: s.hint,
      entryKind: s.entryKind,
    });
  }
  for (const j of journals) {
    const key = j.name.trim().toLowerCase();
    if (!key) continue;
    byKey.set(key, { id: j.id, name: j.name });
  }

  let pool = [...byKey.values()];
  if (q) {
    pool = pool.filter((s) => s.name.toLowerCase().includes(q));
  }

  return pool.slice(0, limit);
}
