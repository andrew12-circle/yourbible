export type StrongsLanguage = "hebrew" | "greek";

export interface StrongsEntry {
  id: string;
  lemma: string;
  transliteration: string;
  pronunciation: string;
  definition: string;
  kjvUsage: string;
}

type RawStrongsRow = {
  lemma?: string;
  xlit?: string;
  pron?: string;
  strongs_def?: string;
  kjv_def?: string;
};

const cache: Partial<Record<StrongsLanguage, Record<string, RawStrongsRow>>> = {};

function normalizeId(input: string): string | null {
  const q = input.trim().toUpperCase();
  const m = /^([HG])(\d{1,5})$/.exec(q) ?? /^(\d{1,5})$/.exec(q);
  if (!m) return null;
  if (m[1] === "H" || m[1] === "G") return `${m[1]}${Number(m[2])}`;
  return null;
}

function rowToEntry(id: string, row: RawStrongsRow): StrongsEntry {
  return {
    id,
    lemma: row.lemma ?? "",
    transliteration: row.xlit ?? "",
    pronunciation: row.pron ?? "",
    definition: row.strongs_def ?? "",
    kjvUsage: row.kjv_def ?? "",
  };
}

async function loadDictionary(lang: StrongsLanguage, signal?: AbortSignal): Promise<Record<string, RawStrongsRow>> {
  if (cache[lang]) return cache[lang]!;
  const file = lang === "hebrew" ? "hebrew.json" : "greek.json";
  const localUrl = `/strongs/${file}`;
  const res = await fetch(localUrl, { signal });
  if (!res.ok) {
    throw new Error(
      lang === "hebrew"
        ? "Strong's Hebrew dictionary not found. Run: npm run fetch:strongs"
        : "Strong's Greek dictionary not found. Run: npm run fetch:strongs",
    );
  }
  const data = (await res.json()) as Record<string, RawStrongsRow>;
  cache[lang] = data;
  return data;
}

/** Parse user input like H430, G26, or bare numbers with language hint. */
export function parseStrongsQuery(
  input: string,
  testamentHint?: "OT" | "NT",
): { id: string; lang: StrongsLanguage } | null {
  const q = input.trim().toUpperCase();
  const explicit = /^([HG])(\d{1,5})$/.exec(q);
  if (explicit) {
    const lang: StrongsLanguage = explicit[1] === "H" ? "hebrew" : "greek";
    return { id: `${explicit[1]}${Number(explicit[2])}`, lang };
  }
  const bare = /^(\d{1,5})$/.exec(q);
  if (bare) {
    const n = Number(bare[1]);
    const lang: StrongsLanguage =
      testamentHint === "NT" || (testamentHint !== "OT" && n <= 5624) ? "greek" : "hebrew";
    const prefix = lang === "hebrew" ? "H" : "G";
    return { id: `${prefix}${n}`, lang };
  }
  const normalized = normalizeId(q);
  if (!normalized) return null;
  return { id: normalized, lang: normalized.startsWith("H") ? "hebrew" : "greek" };
}

export async function lookupStrongs(
  input: string,
  testamentHint?: "OT" | "NT",
  signal?: AbortSignal,
): Promise<StrongsEntry | null> {
  const parsed = parseStrongsQuery(input, testamentHint);
  if (!parsed) return null;
  const dict = await loadDictionary(parsed.lang, signal);
  const row = dict[parsed.id];
  if (!row) return null;
  return rowToEntry(parsed.id, row);
}

/** Extract H/G numbers mentioned in publisher footnote text. */
export function extractStrongsIdsFromText(text: string): string[] {
  const ids = new Set<string>();
  for (const m of text.matchAll(/\b([HG])(\d{1,5})\b/gi)) {
    ids.add(`${m[1]!.toUpperCase()}${Number(m[2])}`);
  }
  return [...ids];
}
