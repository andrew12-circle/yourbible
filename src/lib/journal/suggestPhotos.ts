import { extractReadableProse } from "@/lib/journal/entryDisplay";

const EVENT_KEYWORDS = [
  "birth",
  "born",
  "baby",
  "wedding",
  "married",
  "marriage",
  "funeral",
  "memorial",
  "graduation",
  "party",
  "celebration",
  "celebrate",
  "trip",
  "vacation",
  "travel",
  "visited",
  "hospital",
  "surgery",
  "concert",
  "game",
  "baptism",
  "christening",
  "anniversary",
  "reunion",
  "camp",
  "conference",
  "birthday",
  "holiday",
  "christmas",
  "easter",
  "thanksgiving",
  "dinner",
  "lunch",
  "breakfast",
  "picnic",
  "beach",
  "mountain",
  "road trip",
  "moving day",
  "new job",
  "promotion",
  "retirement",
  "engagement",
  "shower",
  "ceremony",
  "recital",
  "performance",
  "festival",
  "mission trip",
  "retreat",
];

const NARRATIVE_PATTERNS = [
  /\bwe (went|were|had|got|visited|saw|spent|attended|celebrated|arrived)\b/i,
  /\bI (went|was|had|got|visited|saw|spent|attended|celebrated|arrived)\b/i,
  /\btoday\b|\byesterday\b|\blast (night|week|month|year|spring|summer|fall|winter)\b/i,
  /\bthis (morning|afternoon|evening|weekend|week)\b/i,
  /\bat the\b/i,
];

export function shouldSuggestJournalPhotos(opts: {
  body: string;
  title?: string | null;
  hasPhotos: boolean;
  entryKind?: string | null;
}): boolean {
  if (opts.hasPhotos) return false;
  if (opts.entryKind === "vent" || opts.entryKind === "chat") return false;

  const prose = `${opts.title?.trim() ?? ""} ${extractReadableProse(opts.body)}`.trim();
  if (prose.length < 48) return false;

  const words = prose.split(/\s+/).filter(Boolean);
  if (words.length < 10) return false;

  const lower = prose.toLowerCase();
  const hasEventKeyword = EVENT_KEYWORDS.some((kw) => lower.includes(kw));
  const hasNarrative = NARRATIVE_PATTERNS.some((re) => re.test(prose));

  return hasEventKeyword || (hasNarrative && words.length >= 16);
}
