/**
 * "Listening" journal entries store four stages inside `journal_entries.body`
 * as markdown-headed sections so we don't need a schema migration.
 *
 * Order is fixed so we can compose / parse round-trip safely:
 *   ## Thought
 *   ## Words
 *   ## Plan
 *   ## Interpretation
 *
 * If a section is empty we still emit the heading so an edited body keeps its
 * structure and round-trips cleanly.
 */

export type ListeningSectionKey = "thought" | "words" | "plan" | "interpretation";

export interface ListeningSections {
  thought: string;
  words: string;
  plan: string;
  interpretation: string;
}

export interface ListeningSectionDef {
  key: ListeningSectionKey;
  /** Markdown heading rendered in the body. */
  heading: string;
  /** Editor label shown above the textarea. */
  label: string;
  /** Short helper text under the label. */
  hint: string;
  /** Placeholder for the textarea. */
  placeholder: string;
  /** Suggested visible row count when rendered as a textarea. */
  rows: number;
}

export const LISTENING_SECTIONS: readonly ListeningSectionDef[] = [
  {
    key: "thought",
    heading: "Thought",
    label: "1 · The thought",
    hint: "Catch the impression as it lands — a word, a picture, a phrase. Don't edit yet.",
    placeholder: "What did you hear, see, or sense?",
    rows: 3,
  },
  {
    key: "words",
    heading: "Words",
    label: "2 · Into words",
    hint: "Stretch the seed — say what the Spirit seems to be saying, in your own language.",
    placeholder: "Now put it into a sentence or two. What is actually being said?",
    rows: 5,
  },
  {
    key: "plan",
    heading: "Plan",
    label: "3 · Into a plan",
    hint: "What does it invite you toward? An action, a posture, a prayer, a wait.",
    placeholder: "Concrete next step, person to call, prayer to pray, or thing to stop.",
    rows: 4,
  },
  {
    key: "interpretation",
    heading: "Interpretation",
    label: "4 · Test & interpret",
    hint: "Test it against scripture, the character of God, and what you already believe.",
    placeholder:
      "Scripture that supports / challenges this. Spirit, flesh, or enemy? What changes if I act on it?",
    rows: 5,
  },
] as const;

const HEADINGS = LISTENING_SECTIONS.map((s) => s.heading);

const HEADING_RE = new RegExp(
  `^##\\s+(${HEADINGS.map((h) => h.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")).join("|")})\\s*$`,
  "i",
);

/**
 * Returns true when the body looks like a composed listening entry (has at least
 * one of the four `## Heading` markers on its own line).
 */
export function isListeningBody(body: string | null | undefined): boolean {
  if (!body) return false;
  return body.split(/\r?\n/).some((line) => HEADING_RE.test(line.trim()));
}

/**
 * Parse a body into four named sections. Headings outside the known set are
 * preserved in whichever section they land in. If no recognised heading is
 * found at all, the entire body becomes `thought` so first-time conversions
 * don't lose anything.
 */
export function parseListeningBody(body: string | null | undefined): ListeningSections {
  const result: ListeningSections = { thought: "", words: "", plan: "", interpretation: "" };
  if (!body) return result;

  const lines = body.split(/\r?\n/);
  let current: ListeningSectionKey | null = null;
  const buckets: Record<ListeningSectionKey, string[]> = {
    thought: [],
    words: [],
    plan: [],
    interpretation: [],
  };
  const preface: string[] = [];

  for (const line of lines) {
    const m = line.trim().match(HEADING_RE);
    if (m) {
      const heading = m[1].toLowerCase();
      const def = LISTENING_SECTIONS.find((s) => s.heading.toLowerCase() === heading);
      current = def ? def.key : current;
      continue;
    }
    if (current) buckets[current].push(line);
    else preface.push(line);
  }

  const trim = (chunks: string[]) => chunks.join("\n").replace(/^\s+|\s+$/g, "");
  const thought = trim(buckets.thought);
  result.thought = thought || trim(preface);
  result.words = trim(buckets.words);
  result.plan = trim(buckets.plan);
  result.interpretation = trim(buckets.interpretation);
  return result;
}

/**
 * Round-trip the four fields back into a single body string with `## Heading`
 * markers. Empty sections are omitted entirely so we don't ship empty headings
 * to the worldview mirror or AI retrieval.
 */
export function composeListeningBody(sections: ListeningSections): string {
  return LISTENING_SECTIONS.map((s) => {
    const value = sections[s.key]?.trim();
    if (!value) return "";
    return `## ${s.heading}\n${value}`;
  })
    .filter(Boolean)
    .join("\n\n");
}

/** True when the four-section payload has no actual content. */
export function isListeningEmpty(sections: ListeningSections): boolean {
  return (
    !sections.thought.trim() &&
    !sections.words.trim() &&
    !sections.plan.trim() &&
    !sections.interpretation.trim()
  );
}
