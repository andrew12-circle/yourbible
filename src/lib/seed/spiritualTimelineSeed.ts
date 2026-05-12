import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getDefaultJournalId } from "@/lib/journal/journals";

export const SPIRITUAL_TIMELINE_SEED_MARKER = "[seed:spiritual_timeline_v1]" as const;

type Client = SupabaseClient<Database>;

export type SeedTimelineEvent = {
  date: string;
  type: string;
  event: string;
  notes?: string[];
  themes?: string[];
  details?: string[];
  people?: string[];
  topics?: string[];
  books_added?: string[];
};

export type SeedDoc = {
  user?: unknown;
  spiritual_timeline: SeedTimelineEvent[];
  books: string[];
  key_people: string[];
  major_themes?: string[];
};

export type SeedSpiritualTimelineResult = {
  inserted: {
    journals: number;
    books: number;
    people: number;
    mentions: number;
  };
};

export type ClearSeededSpiritualTimelineResult = {
  deletedJournals: number;
  deletedMentions: number;
};

type EntityKind = "book" | "person";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function assertStringArrayField(
  obj: Record<string, unknown>,
  key: string,
  optional: boolean,
): string[] | undefined {
  if (!(key in obj) || obj[key] === undefined) {
    if (optional) return undefined;
    throw new Error(`Missing required field "${key}"`);
  }
  const val = obj[key];
  if (!isStringArray(val)) throw new Error(`Field "${key}" must be an array of strings`);
  return val;
}

function parseTimelineEvent(raw: unknown, index: number): SeedTimelineEvent {
  if (!isRecord(raw)) throw new Error(`spiritual_timeline[${index}] must be an object`);
  const date = raw.date;
  const type = raw.type;
  const event = raw.event;
  if (typeof date !== "string" || !date.trim()) throw new Error(`spiritual_timeline[${index}].date must be a non-empty string`);
  if (typeof type !== "string" || !type.trim()) throw new Error(`spiritual_timeline[${index}].type must be a non-empty string`);
  if (typeof event !== "string" || !event.trim()) throw new Error(`spiritual_timeline[${index}].event must be a non-empty string`);

  const notes = assertStringArrayField(raw, "notes", true);
  const themes = assertStringArrayField(raw, "themes", true);
  const details = assertStringArrayField(raw, "details", true);
  const people = assertStringArrayField(raw, "people", true);
  const topics = assertStringArrayField(raw, "topics", true);
  const books_added = assertStringArrayField(raw, "books_added", true);

  return {
    date: date.trim(),
    type: type.trim(),
    event: event.trim(),
    ...(notes !== undefined ? { notes } : {}),
    ...(themes !== undefined ? { themes } : {}),
    ...(details !== undefined ? { details } : {}),
    ...(people !== undefined ? { people } : {}),
    ...(topics !== undefined ? { topics } : {}),
    ...(books_added !== undefined ? { books_added } : {}),
  };
}

/**
 * Strict parse: throws if the JSON is not the expected spiritual timeline export shape.
 */
export function parseSeedJson(text: string): SeedDoc {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!isRecord(parsed)) throw new Error("Root value must be an object");

  const tlRaw = parsed.spiritual_timeline;
  const booksRaw = parsed.books;
  const peopleRaw = parsed.key_people;

  if (!Array.isArray(tlRaw)) throw new Error("Missing or invalid spiritual_timeline (expected array)");
  if (!isStringArray(booksRaw)) throw new Error("Missing or invalid books (expected string[])");
  if (!isStringArray(peopleRaw)) throw new Error("Missing or invalid key_people (expected string[])");

  if ("major_themes" in parsed && parsed.major_themes !== undefined && !isStringArray(parsed.major_themes)) {
    throw new Error("major_themes must be an array of strings when present");
  }

  const spiritual_timeline = tlRaw.map((e, i) => parseTimelineEvent(e, i));
  const major_themes = isStringArray(parsed.major_themes) ? parsed.major_themes : undefined;

  return {
    ...(parsed.user !== undefined ? { user: parsed.user } : {}),
    spiritual_timeline,
    books: booksRaw.map((b) => b.trim()).filter(Boolean),
    key_people: peopleRaw.map((p) => p.trim()).filter(Boolean),
    ...(major_themes !== undefined ? { major_themes } : {}),
  };
}

function toTitleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function uniqueNonEmptyStrings(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Parse timeline date: date-only uses 09:00:00 local; values with time use `Date` parsing. */
function parseSeedDateToIso(dateStr: string): string {
  const trimmed = dateStr.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
  const m = trimmed.match(dateOnly);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) throw new Error(`Invalid calendar date: ${dateStr}`);
    const local = new Date(y, mo - 1, d, 9, 0, 0, 0);
    if (Number.isNaN(local.getTime())) throw new Error(`Invalid calendar date: ${dateStr}`);
    return local.toISOString();
  }
  const dt = new Date(trimmed);
  if (Number.isNaN(dt.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  return dt.toISOString();
}

function buildJournalBody(entry: SeedTimelineEvent): string {
  const lines: string[] = [toTitleCaseWords(entry.type), ""];

  const pushSection = (label: string, items: string[]) => {
    if (!items.length) return;
    lines.push(`${label}:`);
    for (const it of items) {
      lines.push(`- ${it}`);
    }
    lines.push("");
  };

  pushSection("Notes", entry.notes ?? []);
  pushSection("Themes", entry.themes ?? []);
  pushSection("Details", entry.details ?? []);
  pushSection("Topics", entry.topics ?? []);
  pushSection("People", entry.people ?? []);
  pushSection("Books added", entry.books_added ?? []);

  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  lines.push("");
  lines.push(SPIRITUAL_TIMELINE_SEED_MARKER);
  return lines.join("\n");
}

function buildJournalTags(entry: SeedTimelineEvent): string[] {
  const themes = (entry.themes ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const typeTag = entry.type.trim().toLowerCase();
  const base = [...themes];
  if (typeTag) base.push(typeTag);
  base.push(SPIRITUAL_TIMELINE_SEED_MARKER);
  return uniqueNonEmptyStrings(base);
}

export function summarizeSeed(doc: SeedDoc): {
  journalEntries: number;
  books: number;
  people: number;
  mentions: number;
} {
  const bookSet = new Set<string>();
  for (const b of doc.books) bookSet.add(b.trim().toLowerCase());
  for (const ev of doc.spiritual_timeline) {
    for (const b of ev.books_added ?? []) bookSet.add(b.trim().toLowerCase());
  }

  const personSet = new Set<string>();
  for (const p of doc.key_people) personSet.add(p.trim().toLowerCase());
  for (const ev of doc.spiritual_timeline) {
    for (const p of ev.people ?? []) personSet.add(p.trim().toLowerCase());
  }

  let mentions = 0;
  for (const ev of doc.spiritual_timeline) {
    const pe = uniqueNonEmptyStrings(ev.people ?? []);
    const be = uniqueNonEmptyStrings(ev.books_added ?? []);
    mentions += pe.length + be.length;
  }

  return {
    journalEntries: doc.spiritual_timeline.length,
    books: bookSet.size,
    people: personSet.size,
    mentions,
  };
}

async function journalHasSeedMarker(userId: string, supabase: Client): Promise<boolean> {
  const { data: byBody } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .ilike("body", `%${SPIRITUAL_TIMELINE_SEED_MARKER}%`)
    .limit(1);
  if (byBody && byBody.length > 0) return true;

  const { data: byTags } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .contains("tags", [SPIRITUAL_TIMELINE_SEED_MARKER])
    .limit(1);
  return Boolean(byTags && byTags.length > 0);
}

type EntityCache = Map<string, { id: string; confidence: number | null }>;

function entityCacheKey(kind: EntityKind, title: string): string {
  return `${kind}:${title.trim().toLowerCase()}`;
}

async function loadEntityCache(userId: string, supabase: Client): Promise<EntityCache> {
  const { data, error } = await supabase
    .from("knowledge_entities")
    .select("id, kind, title, confidence")
    .eq("user_id", userId)
    .in("kind", ["book", "person"]);
  if (error) throw new Error(error.message);
  const map: EntityCache = new Map();
  for (const row of data ?? []) {
    if (row.kind !== "book" && row.kind !== "person") continue;
    map.set(entityCacheKey(row.kind as EntityKind, row.title), {
      id: row.id,
      confidence: row.confidence,
    });
  }
  return map;
}

function maxConfidence(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b ?? null;
  if (b == null) return a;
  return Math.max(a, b);
}

async function ensureKnowledgeEntity(
  userId: string,
  supabase: Client,
  cache: EntityCache,
  kind: EntityKind,
  title: string,
  confidence: number,
): Promise<{ id: string; wasInserted: boolean }> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Entity title cannot be empty");

  const key = entityCacheKey(kind, trimmed);
  const existing = cache.get(key);
  if (existing) {
    const merged = maxConfidence(existing.confidence, confidence);
    if (merged != null && merged !== existing.confidence) {
      const { error } = await supabase.from("knowledge_entities").update({ confidence: merged }).eq("id", existing.id);
      if (error) throw new Error(error.message);
      cache.set(key, { id: existing.id, confidence: merged });
    }
    return { id: existing.id, wasInserted: false };
  }

  const { data, error } = await supabase
    .from("knowledge_entities")
    .insert({
      user_id: userId,
      kind,
      title: trimmed,
      confidence,
      metadata: {},
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      const { data: row, error: selErr } = await supabase
        .from("knowledge_entities")
        .select("id, confidence, title")
        .eq("user_id", userId)
        .eq("kind", kind);
      if (selErr) throw new Error(selErr.message);
      const match = (row ?? []).find((r) => r.title.trim().toLowerCase() === trimmed.toLowerCase());
      if (!match) throw new Error(error.message);
      const merged = maxConfidence(match.confidence, confidence);
      if (merged != null && merged !== match.confidence) {
        const { error: upErr } = await supabase.from("knowledge_entities").update({ confidence: merged }).eq("id", match.id);
        if (upErr) throw new Error(upErr.message);
      }
      cache.set(key, { id: match.id, confidence: merged ?? match.confidence });
      return { id: match.id, wasInserted: false };
    }
    throw new Error(error.message);
  }
  if (!data?.id) throw new Error("Failed to create knowledge entity");
  cache.set(key, { id: data.id, confidence });
  return { id: data.id, wasInserted: true };
}

async function insertMentionIfNeeded(
  userId: string,
  supabase: Client,
  entityId: string,
  journalEntryId: string,
  snippet: string,
  confidence: number,
): Promise<boolean> {
  const { error } = await supabase.from("entity_mentions").insert({
    user_id: userId,
    entity_id: entityId,
    journal_entry_id: journalEntryId,
    artifact_id: null,
    belief_id: null,
    snippet: snippet.slice(0, 500),
    confidence,
  });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(error.message);
}

export type SeedSpiritualTimelineOptions = Record<string, never>;

/**
 * Inserts seeded journal rows, knowledge entities, and entity mentions.
 * Aborts if any existing journal entry already contains the seed marker.
 */
export async function seedSpiritualTimeline(
  userId: string,
  supabase: Client,
  doc: SeedDoc,
  _opts?: SeedSpiritualTimelineOptions,
): Promise<SeedSpiritualTimelineResult> {
  void _opts;
  if (await journalHasSeedMarker(userId, supabase)) {
    throw new Error(
      `Seeded spiritual timeline entries already exist (marker ${SPIRITUAL_TIMELINE_SEED_MARKER}). ` +
        'Use "Clear seeded entries" on Settings, or delete those journal entries manually, then try again.',
    );
  }

  const journalId = await getDefaultJournalId(userId);
  if (!journalId) throw new Error("No default journal found. Create a journal first.");

  const cache = await loadEntityCache(userId, supabase);

  const EXPLICIT = 0.95;
  const INLINE = 0.7;

  let journals = 0;
  let mentions = 0;
  let booksCreated = 0;
  let peopleCreated = 0;

  for (const b of doc.books) {
    const r = await ensureKnowledgeEntity(userId, supabase, cache, "book", b, EXPLICIT);
    if (r.wasInserted) booksCreated += 1;
  }
  for (const p of doc.key_people) {
    const r = await ensureKnowledgeEntity(userId, supabase, cache, "person", p, EXPLICIT);
    if (r.wasInserted) peopleCreated += 1;
  }

  for (const ev of doc.spiritual_timeline) {
    const entryAtTs = parseSeedDateToIso(ev.date);
    const entryAt = entryAtTs.slice(0, 10);

    const body = buildJournalBody(ev);
    const tags = buildJournalTags(ev);

    const { data: ins, error: insErr } = await supabase
      .from("journal_entries")
      .insert({
        user_id: userId,
        journal_id: journalId,
        title: ev.event,
        body,
        tags,
        entry_at_ts: entryAtTs,
        entry_at: entryAt,
        analyze_for_mirror: false,
        pinned: false,
      })
      .select("id")
      .maybeSingle();

    if (insErr || !ins?.id) throw new Error(insErr?.message ?? "Failed to insert journal entry");
    journals += 1;
    const entryId = ins.id;

    const mentionKeys = new Set<string>();

    const inlinePeople = uniqueNonEmptyStrings(ev.people ?? []);
    const inlineBooks = uniqueNonEmptyStrings(ev.books_added ?? []);

    for (const name of inlinePeople) {
      const r = await ensureKnowledgeEntity(userId, supabase, cache, "person", name, INLINE);
      if (r.wasInserted) peopleCreated += 1;
      const mk = `${r.id}:${entryId}`;
      if (mentionKeys.has(mk)) continue;
      mentionKeys.add(mk);
      const created = await insertMentionIfNeeded(userId, supabase, r.id, entryId, ev.event, INLINE);
      if (created) mentions += 1;
    }
    for (const title of inlineBooks) {
      const r = await ensureKnowledgeEntity(userId, supabase, cache, "book", title, INLINE);
      if (r.wasInserted) booksCreated += 1;
      const mk = `${r.id}:${entryId}`;
      if (mentionKeys.has(mk)) continue;
      mentionKeys.add(mk);
      const created = await insertMentionIfNeeded(userId, supabase, r.id, entryId, ev.event, INLINE);
      if (created) mentions += 1;
    }
  }

  return {
    inserted: {
      journals,
      books: booksCreated,
      people: peopleCreated,
      mentions,
    },
  };
}

/**
 * Deletes journal entries that contain the spiritual timeline seed marker (body or tags).
 * Dependent `entity_mentions` rows are removed via ON DELETE CASCADE on `journal_entry_id`.
 */
export async function clearSeededSpiritualTimeline(
  userId: string,
  supabase: Client,
): Promise<ClearSeededSpiritualTimelineResult> {
  const marker = SPIRITUAL_TIMELINE_SEED_MARKER;
  const { data: byBody, error: bodyErr } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .ilike("body", `%${marker}%`);
  if (bodyErr) throw new Error(bodyErr.message);

  const { data: byTags, error: tagsErr } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .contains("tags", [marker]);
  if (tagsErr) throw new Error(tagsErr.message);

  const ids = new Set<string>();
  for (const r of byBody ?? []) ids.add(r.id);
  for (const r of byTags ?? []) ids.add(r.id);
  const idList = [...ids];
  if (idList.length === 0) return { deletedJournals: 0, deletedMentions: 0 };

  const { count: mentionCount, error: mentionErr } = await supabase
    .from("entity_mentions")
    .select("*", { count: "exact", head: true })
    .in("journal_entry_id", idList);
  if (mentionErr) throw new Error(mentionErr.message);

  const { error: delErr } = await supabase.from("journal_entries").delete().eq("user_id", userId).in("id", idList);
  if (delErr) throw new Error(delErr.message);

  return { deletedJournals: idList.length, deletedMentions: mentionCount ?? 0 };
}
