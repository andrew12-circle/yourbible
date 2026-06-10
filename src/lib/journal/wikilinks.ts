/** Reflect-style `[[wikilinks]]` parsed from journal entry bodies. */

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type WikilinkTargetKind = "entry" | "artifact" | "belief" | "entity" | "verse";

export type ParsedWikilink =
  | { target: "entry"; mode: "id"; id: string; raw: string }
  | { target: "entry"; mode: "title"; title: string; raw: string }
  | { target: "artifact"; mode: "id"; id: string; raw: string }
  | { target: "artifact"; mode: "title"; title: string; raw: string }
  | { target: "belief"; mode: "id"; id: string; raw: string }
  | { target: "belief"; mode: "title"; title: string; raw: string }
  | { target: "entity"; mode: "id"; id: string; raw: string }
  | { target: "entity"; mode: "title"; title: string; raw: string }
  | { target: "verse"; ref: string; raw: string };

const PREFIX_MAP: { prefix: string; target: WikilinkTargetKind }[] = [
  { prefix: "entry:", target: "entry" },
  { prefix: "journal:", target: "entry" },
  { prefix: "artifact:", target: "artifact" },
  { prefix: "video:", target: "artifact" },
  { prefix: "book:", target: "artifact" },
  { prefix: "belief:", target: "belief" },
  { prefix: "entity:", target: "entity" },
  { prefix: "person:", target: "entity" },
  { prefix: "verse:", target: "verse" },
  { prefix: "scripture:", target: "verse" },
];

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
  for (const { prefix, target } of PREFIX_MAP) {
    if (!lower.startsWith(prefix)) continue;
    const payload = raw.slice(prefix.length).trim();
    if (target === "verse") {
      if (payload.length > 0 && payload.length <= 80) return { target: "verse", ref: payload, raw };
      return null;
    }
    if (UUID_RE.test(payload)) return { target, mode: "id", id: payload, raw } as ParsedWikilink;
    if (payload.length > 0 && payload.length <= 200) {
      return { target, mode: "title", title: payload, raw } as ParsedWikilink;
    }
    return null;
  }
  if (UUID_RE.test(raw)) return { target: "entry", mode: "id", id: raw, raw };
  if (raw.length > 0 && raw.length <= 200) return { target: "entry", mode: "title", title: raw, raw };
  return null;
}

export interface TitleIndexRow {
  id: string;
  title: string | null;
}

export interface BeliefIndexRow {
  id: string;
  statement: string;
}

export interface ResolvedWikilinks {
  entryIds: string[];
  artifactIds: string[];
  beliefIds: string[];
  entityIds: string[];
  verses: string[];
}

function resolveTitle(query: string, rows: TitleIndexRow[]): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const titled = rows.filter((r) => r.title?.trim());
  const exact = titled.find((r) => r.title!.trim().toLowerCase() === q);
  if (exact) return exact.id;
  const partial = titled.find((r) => r.title!.trim().toLowerCase().includes(q));
  return partial?.id ?? null;
}

function resolveBelief(query: string, rows: BeliefIndexRow[]): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = rows.find((r) => r.statement.trim().toLowerCase() === q);
  if (exact) return exact.id;
  const partial = rows.find((r) => r.statement.trim().toLowerCase().includes(q));
  return partial?.id ?? null;
}

/** Resolve all wikilink targets (excludes self entry). */
export function resolveWikilinks(
  parsed: ParsedWikilink[],
  selfEntryId: string,
  indexes: {
    entries: TitleIndexRow[];
    artifacts: TitleIndexRow[];
    beliefs: BeliefIndexRow[];
    entities: TitleIndexRow[];
  },
): ResolvedWikilinks {
  const entryIds = new Set<string>();
  const artifactIds = new Set<string>();
  const beliefIds = new Set<string>();
  const entityIds = new Set<string>();
  const verses = new Set<string>();

  for (const link of parsed) {
    switch (link.target) {
      case "entry":
        if (link.mode === "id") {
          if (link.id !== selfEntryId) entryIds.add(link.id);
        } else {
          const id = resolveTitle(link.title, indexes.entries);
          if (id && id !== selfEntryId) entryIds.add(id);
        }
        break;
      case "artifact":
        if (link.mode === "id") artifactIds.add(link.id);
        else {
          const id = resolveTitle(link.title, indexes.artifacts);
          if (id) artifactIds.add(id);
        }
        break;
      case "belief":
        if (link.mode === "id") beliefIds.add(link.id);
        else {
          const id = resolveBelief(link.title, indexes.beliefs);
          if (id) beliefIds.add(id);
        }
        break;
      case "entity":
        if (link.mode === "id") entityIds.add(link.id);
        else {
          const id = resolveTitle(link.title, indexes.entities);
          if (id) entityIds.add(id);
        }
        break;
      case "verse":
        verses.add(link.ref);
        break;
    }
  }

  return {
    entryIds: [...entryIds],
    artifactIds: [...artifactIds],
    beliefIds: [...beliefIds],
    entityIds: [...entityIds],
    verses: [...verses],
  };
}

/** @deprecated Use resolveWikilinks — entry IDs only. */
export function resolveWikilinksToEntryIds(
  parsed: ParsedWikilink[],
  selfEntryId: string,
  titleIndex: TitleIndexRow[],
): string[] {
  return resolveWikilinks(parsed, selfEntryId, {
    entries: titleIndex,
    artifacts: [],
    beliefs: [],
    entities: [],
  }).entryIds;
}

/** Node radius from total degree (Reflect-style hubs). */
export function graphNodeValFromDegree(degree: number): number {
  return 2 + Math.sqrt(Math.max(0, degree)) * 2.5;
}
