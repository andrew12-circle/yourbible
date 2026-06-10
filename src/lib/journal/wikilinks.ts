/** Reflect-style `[[wikilinks]]` parsed from journal entry bodies. */

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedWikilink =
  | { kind: "entry_id"; entryId: string; raw: string }
  | { kind: "title"; title: string; raw: string };

/** Extract unique wikilink tokens from prose (order preserved, deduped). */
export function parseWikilinks(text: string): ParsedWikilink[] {
  if (!text?.trim()) return [];
  const seen = new Set<string>();
  const out: ParsedWikilink[] = [];
  for (const match of text.matchAll(WIKILINK_RE)) {
    const raw = match[1]?.trim();
    if (!raw || seen.has(raw.toLowerCase())) continue;
    seen.add(raw.toLowerCase());
    const parsed = parseWikilinkToken(raw);
    if (parsed) out.push(parsed);
  }
  return out;
}

function parseWikilinkToken(raw: string): ParsedWikilink | null {
  const lower = raw.toLowerCase();
  for (const prefix of ["entry:", "journal:"] as const) {
    if (lower.startsWith(prefix)) {
      const id = raw.slice(prefix.length).trim();
      if (UUID_RE.test(id)) return { kind: "entry_id", entryId: id, raw };
      return null;
    }
  }
  if (UUID_RE.test(raw)) return { kind: "entry_id", entryId: raw, raw };
  if (raw.length > 0 && raw.length <= 200) return { kind: "title", title: raw, raw };
  return null;
}

export interface EntryTitleRow {
  id: string;
  title: string | null;
}

/** Resolve parsed wikilinks to entry UUIDs (excludes self). */
export function resolveWikilinksToEntryIds(
  parsed: ParsedWikilink[],
  selfEntryId: string,
  titleIndex: EntryTitleRow[],
): string[] {
  const ids = new Set<string>();
  for (const link of parsed) {
    if (link.kind === "entry_id") {
      if (link.entryId !== selfEntryId) ids.add(link.entryId);
      continue;
    }
    const match = resolveTitle(link.title, titleIndex);
    if (match && match !== selfEntryId) ids.add(match);
  }
  return [...ids];
}

function resolveTitle(query: string, rows: EntryTitleRow[]): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const titled = rows.filter((r) => r.title?.trim());
  const exact = titled.find((r) => r.title!.trim().toLowerCase() === q);
  if (exact) return exact.id;
  const partial = titled.find((r) => r.title!.trim().toLowerCase().includes(q));
  return partial?.id ?? null;
}

/** Node radius from total degree (Reflect-style hubs). */
export function graphNodeValFromDegree(degree: number): number {
  return 2 + Math.sqrt(Math.max(0, degree)) * 2.5;
}
