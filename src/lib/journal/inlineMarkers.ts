/** Inline `#tags` and `@journal` markers typed directly in journal body text. */

export type InlineMarkerKind = "hashtag" | "journal";

export type ActiveInlineMarker = {
  kind: InlineMarkerKind;
  query: string;
  start: number;
  end: number;
};

export type JournalNameRow = { id: string; name: string };

const SINGLE_HASHTAG_RE = /(?:^|[\s])#([a-zA-Z][\w-]*)/g;
const MULTI_HASHTAG_RE = /(?:^|[\s])#(\s+)([a-z][\w-]*(?:\s+[a-z][\w-]*)*)/g;
const JOURNAL_MENTION_RE =
  /(?:^|[\s])@(\s*)([^\n@#,.;]+?)(?=\s*(?:$|\n|[.,;!?]|@|#|\[\[))/gi;

/** Normalize a raw hashtag token for storage (lowercase, spaces → hyphens). */
export function normalizeInlineTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

function isMarkdownHeadingLine(line: string): boolean {
  return /^#\s+[A-Z]/.test(line);
}

/** Extract unique `#tags` from prose (skips markdown `# Heading` lines). */
export function parseInlineHashtags(text: string): string[] {
  if (!text?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of text.split("\n")) {
    const searchLine = isMarkdownHeadingLine(line) ? line.replace(/^#\s+[A-Z][^\n]*/, "") : line;
    for (const match of searchLine.matchAll(SINGLE_HASHTAG_RE)) {
      const tag = normalizeInlineTag(match[1] ?? "");
      if (tag.length < 2 || seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
    for (const match of searchLine.matchAll(MULTI_HASHTAG_RE)) {
      const tag = normalizeInlineTag(match[2] ?? "");
      if (tag.length < 2 || seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

/** Extract unique `@journal name` tokens from prose. */
export function parseInlineJournalMentions(text: string): string[] {
  if (!text?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of text.matchAll(JOURNAL_MENTION_RE)) {
    const name = match[2]?.trim();
    if (!name || name.length < 2) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Match a journal by exact name, then partial (either direction). */
export function resolveJournalByName(
  query: string,
  journals: JournalNameRow[],
): JournalNameRow | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = journals.find((j) => j.name.trim().toLowerCase() === q);
  if (exact) return exact;

  let best: JournalNameRow | null = null;
  let bestLen = 0;
  for (const j of journals) {
    const n = j.name.trim().toLowerCase();
    if (!n) continue;
    if (q.includes(n) || n.includes(q)) {
      if (n.length > bestLen) {
        best = j;
        bestLen = n.length;
      }
    }
  }
  return best;
}

/** First `@mention` in body that resolves to a journal id. */
export function resolveJournalIdFromBody(
  body: string,
  journals: JournalNameRow[],
): string | null {
  for (const mention of parseInlineJournalMentions(body)) {
    const hit = resolveJournalByName(mention, journals);
    if (hit) return hit.id;
  }
  return null;
}

/** Merge inline `#tags` with manually added tags (deduped, order preserved). */
export function mergeInlineTags(body: string, manualTags: string[]): string[] {
  const inline = parseInlineHashtags(body);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...manualTags, ...inline]) {
    const n = normalizeInlineTag(t);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** Tags that were added manually (not currently present inline in body). */
export function tagsWithoutInline(body: string, tags: string[]): string[] {
  const inline = new Set(parseInlineHashtags(body));
  return tags.filter((t) => !inline.has(normalizeInlineTag(t)));
}

/** Marker token under the caret while typing `@…` or `#…`. */
export function getActiveInlineMarker(text: string, cursor: number): ActiveInlineMarker | null {
  if (cursor < 0 || cursor > text.length) return null;

  let i = cursor - 1;
  while (i >= 0 && text[i] !== "@" && text[i] !== "#") {
    if (/[\n.,;!?]/.test(text[i] ?? "")) return null;
    i--;
  }
  if (i < 0) return null;

  const markerChar = text[i];
  if (markerChar !== "@" && markerChar !== "#") return null;
  if (i > 0 && !/\s/.test(text[i - 1] ?? "")) return null;

  let queryStart = i + 1;
  if (text[queryStart] === " ") queryStart++;

  const query = text.slice(queryStart, cursor);
  if (/[\n@#]/.test(query)) return null;

  return {
    kind: markerChar === "@" ? "journal" : "hashtag",
    query,
    start: i,
    end: cursor,
  };
}

/** Replace the active marker token with a chosen suggestion. */
export function replaceInlineMarkerToken(
  text: string,
  marker: ActiveInlineMarker,
  replacement: string,
): { text: string; cursor: number } {
  const insert =
    marker.kind === "hashtag"
      ? `#${normalizeInlineTag(replacement)}`
      : `@${replacement.trim()}`;

  const before = text.slice(0, marker.start);
  const after = text.slice(marker.end);
  const next = `${before}${insert} ${after}`;
  return { text: next, cursor: before.length + insert.length + 1 };
}

export function filterJournalSuggestions(
  query: string,
  journals: JournalNameRow[],
  limit = 8,
): JournalNameRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return journals.slice(0, limit);
  return journals
    .filter((j) => j.name.trim().toLowerCase().includes(q))
    .slice(0, limit);
}

export function filterTagSuggestions(query: string, knownTags: string[], limit = 8): string[] {
  const q = normalizeInlineTag(query);
  const pool = knownTags.map(normalizeInlineTag).filter(Boolean);
  if (!q) return [...new Set(pool)].slice(0, limit);
  const matches = pool.filter((t) => t.includes(q));
  const exact = normalizeInlineTag(query);
  if (exact.length >= 2 && !matches.includes(exact)) matches.unshift(exact);
  return [...new Set(matches)].slice(0, limit);
}
