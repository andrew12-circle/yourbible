/**
 * Shared research-pack core for claim-research-pack and question-research-pack.
 */
export const researchPackCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";

export const DEFAULT_LENS_IDS = [
  "scripture_context",
  "historical_theology",
  "opposing_views",
  "denominational_notes",
  "logical_audit",
  "scientific_relevance",
  "synthesis",
] as const;

export const VALIDATION_LENS_IDS = [
  "bible_alignment",
  "historical_context",
  "independent_voices",
] as const;

export type StandardLensId = (typeof DEFAULT_LENS_IDS)[number];
export type ValidationLensId = (typeof VALIDATION_LENS_IDS)[number];
export type LensId = StandardLensId | ValidationLensId;
export type PackType = "standard" | "validation";
type Epistemic = "training_only" | "scripture_text" | "web_snippet" | "mixed" | "unknown";

export type IndependentVoice = {
  name: string;
  tradition_or_role: string;
  angle: string;
  summary: string;
  agreement: "agrees" | "qualifies" | "disagrees" | "unclear";
  source_url?: string;
  epistemic: "web_snippet" | "training_only";
};

type BookRow = { name: string; abbr: string };

/** Mirrors `src/data/books.ts` (66-book Protestant set) for server-side ref resolution. */
const BOOKS: BookRow[] = [
  { name: "Genesis", abbr: "Gen" }, { name: "Exodus", abbr: "Exo" }, { name: "Leviticus", abbr: "Lev" },
  { name: "Numbers", abbr: "Num" }, { name: "Deuteronomy", abbr: "Deu" }, { name: "Joshua", abbr: "Jos" },
  { name: "Judges", abbr: "Jdg" }, { name: "Ruth", abbr: "Rut" }, { name: "1 Samuel", abbr: "1Sa" },
  { name: "2 Samuel", abbr: "2Sa" }, { name: "1 Kings", abbr: "1Ki" }, { name: "2 Kings", abbr: "2Ki" },
  { name: "1 Chronicles", abbr: "1Ch" }, { name: "2 Chronicles", abbr: "2Ch" }, { name: "Ezra", abbr: "Ezr" },
  { name: "Nehemiah", abbr: "Neh" }, { name: "Esther", abbr: "Est" }, { name: "Job", abbr: "Job" },
  { name: "Psalms", abbr: "Psa" }, { name: "Proverbs", abbr: "Pro" }, { name: "Ecclesiastes", abbr: "Ecc" },
  { name: "Song of Solomon", abbr: "Sng" }, { name: "Isaiah", abbr: "Isa" }, { name: "Jeremiah", abbr: "Jer" },
  { name: "Lamentations", abbr: "Lam" }, { name: "Ezekiel", abbr: "Ezk" }, { name: "Daniel", abbr: "Dan" },
  { name: "Hosea", abbr: "Hos" }, { name: "Joel", abbr: "Jol" }, { name: "Amos", abbr: "Amo" },
  { name: "Obadiah", abbr: "Oba" }, { name: "Jonah", abbr: "Jon" }, { name: "Micah", abbr: "Mic" },
  { name: "Nahum", abbr: "Nam" }, { name: "Habakkuk", abbr: "Hab" }, { name: "Zephaniah", abbr: "Zep" },
  { name: "Haggai", abbr: "Hag" }, { name: "Zechariah", abbr: "Zec" }, { name: "Malachi", abbr: "Mal" },
  { name: "Matthew", abbr: "Mat" }, { name: "Mark", abbr: "Mrk" }, { name: "Luke", abbr: "Luk" },
  { name: "John", abbr: "Jhn" }, { name: "Acts", abbr: "Act" }, { name: "Romans", abbr: "Rom" },
  { name: "1 Corinthians", abbr: "1Co" }, { name: "2 Corinthians", abbr: "2Co" }, { name: "Galatians", abbr: "Gal" },
  { name: "Ephesians", abbr: "Eph" }, { name: "Philippians", abbr: "Php" }, { name: "Colossians", abbr: "Col" },
  { name: "1 Thessalonians", abbr: "1Th" }, { name: "2 Thessalonians", abbr: "2Th" }, { name: "1 Timothy", abbr: "1Ti" },
  { name: "2 Timothy", abbr: "2Ti" }, { name: "Titus", abbr: "Tit" }, { name: "Philemon", abbr: "Phm" },
  { name: "Hebrews", abbr: "Heb" }, { name: "James", abbr: "Jas" }, { name: "1 Peter", abbr: "1Pe" },
  { name: "2 Peter", abbr: "2Pe" }, { name: "1 John", abbr: "1Jn" }, { name: "2 John", abbr: "2Jn" },
  { name: "3 John", abbr: "3Jn" }, { name: "Jude", abbr: "Jud" }, { name: "Revelation", abbr: "Rev" },
];

const BOOK_BY_NAME = new Map<string, string>();
const BOOK_BY_ABBR = new Map<string, string>();
for (const b of BOOKS) {
  BOOK_BY_NAME.set(b.name.toLowerCase().replace(/\s+/g, " "), b.abbr);
  BOOK_BY_ABBR.set(b.abbr.toLowerCase(), b.abbr);
}

const EXTRA_ALIASES: Record<string, string> = {
  "psalm": "Psa", "psalms": "Psa", "song of songs": "Sng", "songofsongs": "Sng",
  "matt": "Mat", "matthew": "Mat", "mk": "Mrk", "mark": "Mrk", "lk": "Luk", "luke": "Luk",
  "jn": "Jhn", "joh": "Jhn", "john": "Jhn", "rom": "Rom", "romans": "Rom",
  "i corinthians": "1Co", "ii corinthians": "2Co", "1st corinthians": "1Co", "2nd corinthians": "2Co",
  "i thessalonians": "1Th", "ii thessalonians": "2Th", "i timothy": "1Ti", "ii timothy": "2Ti",
  "i peter": "1Pe", "ii peter": "2Pe", "i john": "1Jn", "ii john": "2Jn", "iii john": "3Jn",
  "phil": "Php", "philippians": "Php", "phlp": "Php", "col": "Col", "gal": "Gal",
  "1 cor": "1Co", "2 cor": "2Co", "1 thess": "1Th", "2 thess": "2Th",
};

function normalizeBookToken(s: string): string {
  return s.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

function resolveBookAbbrev(bookRaw: string): string | null {
  const key = normalizeBookToken(bookRaw);
  if (!key) return null;
  const alias = EXTRA_ALIASES[key];
  if (alias) return alias;
  if (BOOK_BY_ABBR.has(key)) return BOOK_BY_ABBR.get(key)!;
  if (BOOK_BY_NAME.has(key)) return BOOK_BY_NAME.get(key)!;
  // numbered books: "1cor", "1 cor", "first corinthians"
  const mNum = key.match(/^(?:1|2|3|i|ii|iii|first|second|third)\s+(.+)$/);
  if (mNum) {
    const rest = mNum[1].trim();
    const n = key.startsWith("1") || key.startsWith("i ") || key.startsWith("first") ? "1"
      : key.startsWith("3") || key.startsWith("iii") || key.startsWith("third") ? "3"
      : "2";
    const tryKeys = [`${n} ${rest}`, rest];
    for (const tk of tryKeys) {
      const nk = normalizeBookToken(tk);
      if (EXTRA_ALIASES[nk]) return EXTRA_ALIASES[nk];
      if (BOOK_BY_NAME.has(nk)) {
        const full = BOOKS.find((b) => b.name.toLowerCase() === nk);
        if (full?.name.startsWith(`${n} `) || full?.name.startsWith(n === "1" ? "I " : n === "2" ? "II " : "III ")) {
          return full.abbr;
        }
      }
    }
    const combined = `${n} ${rest}`.replace(/\s+/g, " ");
    if (BOOK_BY_NAME.has(combined)) return BOOK_BY_NAME.get(combined)!;
  }
  return null;
}

type ParsedRef = { book: string; chapter: number; v0?: number; v1?: number };

function parseSingleRef(raw: string): ParsedRef | null {
  const s = raw
    .trim()
    .replace(/^[[(<"'`]+/, "")
    .replace(/[)\]>"'`]+$/, "")
    .trim();
  if (!s) return null;
  const m = s.match(/^(.+?)\s+(\d+)\s*(?::\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/);
  if (!m) return null;
  const bookPart = m[1].trim();
  const chapter = parseInt(m[2], 10);
  if (!Number.isFinite(chapter) || chapter < 1) return null;
  const abbr = resolveBookAbbrev(bookPart);
  if (!abbr) return null;
  const v0 = m[3] ? parseInt(m[3], 10) : undefined;
  const v1 = m[4] ? parseInt(m[4], 10) : v0;
  if (v0 !== undefined && (!Number.isFinite(v0) || v0 < 1)) return null;
  if (v1 !== undefined && (!Number.isFinite(v1) || v1 < 1)) return null;
  return { book: abbr, chapter, v0, v1: v1 ?? v0 };
}

export function extractRefsFromText(text: string, max: number): string[] {
  const names = [...BOOKS].sort((a, b) => b.name.length - a.name.length).map((b) => b.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const abbrs = [...new Set(BOOKS.map((b) => b.abbr))].sort((a, b) => b.length - a.length)
    .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(
    `(?:\\b(?:[1-3]\\s+)?(?:${names.join("|")}|${abbrs.join("|")})\\s+\\d+(?::\\d+(?:\\s*[-–]\\s*\\d+)?)?)`,
    "gi",
  );
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const hit = m[0].trim();
    if (hit && !out.includes(hit)) out.push(hit);
    if (out.length >= max) break;
  }
  return out;
}

export function researchPackJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...researchPackCorsHeaders, "Content-Type": "application/json" },
  });
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return fence ? fence[1].trim() : t;
}

function extractGeminiText(data: unknown): string {
  if (!isRecord(data)) return "";
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const first = candidates[0];
  if (!isRecord(first)) return "";
  const content = first.content;
  if (!isRecord(content)) return "";
  const parts = content.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (isRecord(p) && typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

async function callGeminiJson(
  systemText: string,
  userPayload: string,
  apiKey: string,
): Promise<{ rawText: string; ok: boolean; err?: string }> {
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: userPayload }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => "");
    return { rawText: "", ok: false, err: `Gemini request failed (${geminiRes.status}): ${errText.slice(0, 500)}` };
  }
  const geminiJson: unknown = await geminiRes.json().catch(() => null);
  return { rawText: extractGeminiText(geminiJson), ok: true };
}

type PassageVerse = { number: number; text: string };

async function fetchDefaultBibleId(
  supabaseUrl: string,
  anonKey: string,
): Promise<string | null> {
  const r = await fetch(`${supabaseUrl}/functions/v1/bible-passage?action=bibles`, {
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
  });
  if (!r.ok) return null;
  const j: unknown = await r.json().catch(() => null);
  if (!isRecord(j)) return null;
  const data = j.data;
  if (!Array.isArray(data)) return null;
  const eng = data.find((b) =>
    isRecord(b) && isRecord(b.language) && String(b.language.id).toLowerCase() === "eng"
  );
  if (isRecord(eng) && typeof eng.id === "string") return eng.id;
  const first = data[0];
  return isRecord(first) && typeof first.id === "string" ? first.id : null;
}

async function fetchChapterVerses(
  supabaseUrl: string,
  anonKey: string,
  bibleId: string,
  book: string,
  chapter: number,
): Promise<{ reference: string; verses: PassageVerse[] } | { error: string }> {
  const u = new URL(`${supabaseUrl}/functions/v1/bible-passage`);
  u.searchParams.set("bibleId", bibleId);
  u.searchParams.set("book", book);
  u.searchParams.set("chapter", String(chapter));
  const r = await fetch(u.toString(), { headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey } });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    return { error: `bible-passage ${r.status}: ${t.slice(0, 200)}` };
  }
  const j: unknown = await r.json().catch(() => null);
  if (!isRecord(j)) return { error: "Invalid passage JSON" };
  const reference = typeof j.reference === "string" ? j.reference : `${book} ${chapter}`;
  const versesRaw = j.verses;
  const verses: PassageVerse[] = [];
  if (Array.isArray(versesRaw)) {
    for (const v of versesRaw) {
      if (!isRecord(v)) continue;
      const num = typeof v.number === "number" ? v.number : parseInt(String(v.number), 10);
      const text = typeof v.text === "string" ? v.text : "";
      if (Number.isFinite(num) && text) verses.push({ number: num, text });
    }
  }
  return { reference, verses };
}

function formatVerseSlice(verses: PassageVerse[], v0?: number, v1?: number): string {
  if (!verses.length) return "";
  if (v0 == null) {
    return verses.map((x) => `[${x.number}] ${x.text}`).join("\n");
  }
  const hi = v1 ?? v0;
  const slice = verses.filter((x) => x.number >= v0 && x.number <= hi);
  if (!slice.length) return verses.map((x) => `[${x.number}] ${x.text}`).join("\n");
  return slice.map((x) => `[${x.number}] ${x.text}`).join("\n");
}

function isStandardLensId(s: string): s is StandardLensId {
  return (DEFAULT_LENS_IDS as readonly string[]).includes(s);
}

function isValidationLensId(s: string): s is ValidationLensId {
  return (VALIDATION_LENS_IDS as readonly string[]).includes(s);
}

export function isLensId(s: string, packType: PackType): s is LensId {
  return packType === "validation" ? isValidationLensId(s) : isStandardLensId(s);
}

function isEpistemic(s: string): s is Epistemic {
  return s === "training_only" || s === "scripture_text" || s === "web_snippet" || s === "mixed" ||
    s === "unknown";
}

function isAgreement(s: string): s is IndependentVoice["agreement"] {
  return s === "agrees" || s === "qualifies" || s === "disagrees" || s === "unclear";
}

function parseIndependentVoices(cell: Record<string, unknown>): IndependentVoice[] | null {
  const raw = cell.voices;
  if (!Array.isArray(raw)) return null;
  const out: IndependentVoice[] = [];
  for (const item of raw.slice(0, 5)) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const tradition_or_role = typeof item.tradition_or_role === "string" ? item.tradition_or_role.trim() : "";
    const angle = typeof item.angle === "string" ? item.angle.trim() : "";
    const summary = typeof item.summary === "string" ? item.summary.trim() : "";
    const agreement = typeof item.agreement === "string" ? item.agreement.trim() : "";
    const ep = typeof item.epistemic === "string" ? item.epistemic.trim() : "";
    if (!name || !summary) continue;
    if (!isAgreement(agreement)) continue;
    if (ep !== "web_snippet" && ep !== "training_only") continue;
    const source_url = typeof item.source_url === "string" && item.source_url.startsWith("http")
      ? item.source_url.trim()
      : undefined;
    out.push({
      name,
      tradition_or_role: tradition_or_role || "Teacher / scholar",
      angle: angle || "General",
      summary,
      agreement,
      epistemic: ep,
      ...(source_url ? { source_url } : {}),
    });
  }
  return out.length >= 1 ? out : null;
}

export type ScriptureEntry = { ref: string; reference?: string; text?: string; error?: string };

async function gatherScripture(
  supabaseUrl: string,
  anonKey: string,
  bibleId: string,
  refs: string[],
): Promise<{ block: string; entries: ScriptureEntry[] }> {
  const cache = new Map<string, { reference: string; verses: PassageVerse[] } | { error: string }>();
  const entries: ScriptureEntry[] = [];
  for (const ref of refs) {
    const parsed = parseSingleRef(ref);
    if (!parsed) {
      entries.push({ ref, error: "Could not parse reference; skipped." });
      continue;
    }
    const key = `${parsed.book}|${parsed.chapter}`;
    let got = cache.get(key);
    if (!got) {
      got = await fetchChapterVerses(supabaseUrl, anonKey, bibleId, parsed.book, parsed.chapter);
      cache.set(key, got);
    }
    if ("error" in got) {
      entries.push({ ref, error: got.error });
      continue;
    }
    const text = formatVerseSlice(got.verses, parsed.v0, parsed.v1);
    entries.push({ ref, reference: got.reference, text });
  }
  const lines: string[] = ["## Fetched passage text (API.Bible; English translation)", ""];
  for (const e of entries) {
    if (e.error) lines.push(`- ${e.ref}: _${e.error}_`);
    else lines.push(`### ${e.ref}${e.reference ? ` (${e.reference})` : ""}\n\n${e.text ?? ""}`.trimEnd());
  }
  return { block: lines.join("\n\n"), entries };
}

type WebSearchHit = { title: string; url: string; snippet: string };

function formatWebSearchHits(hits: WebSearchHit[]): string {
  return hits
    .map((h) => `- ${h.title}${h.url ? ` (${h.url})` : ""}\n  ${h.snippet}`)
    .join("\n\n");
}

async function fetchBraveHits(query: string, count: number): Promise<WebSearchHit[]> {
  const key = Deno.env.get("BRAVE_SEARCH_API_KEY") ?? Deno.env.get("BRAVE_API_KEY");
  if (!key) return [];
  const u = new URL("https://api.search.brave.com/res/v1/web/search");
  u.searchParams.set("q", query.trim().slice(0, 400));
  u.searchParams.set("count", String(Math.min(10, Math.max(1, count))));
  const r = await fetch(u.toString(), { headers: { Accept: "application/json", "X-Subscription-Token": key } });
  if (!r.ok) return [];
  const j: unknown = await r.json().catch(() => null);
  const hits: WebSearchHit[] = [];
  if (isRecord(j) && isRecord(j.web) && Array.isArray(j.web.results)) {
    for (const item of j.web.results.slice(0, count)) {
      if (!isRecord(item)) continue;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const snippet = typeof item.description === "string" ? item.description.trim() : "";
      const url = typeof item.url === "string" ? item.url.trim() : "";
      if ((title || snippet) && url.startsWith("http")) hits.push({ title: title || url, url, snippet });
    }
  }
  return hits;
}

async function fetchSerpApiHits(query: string, count: number): Promise<WebSearchHit[]> {
  const key = Deno.env.get("SERPAPI_API_KEY");
  if (!key) return [];
  const u = new URL("https://serpapi.com/search.json");
  u.searchParams.set("engine", "google");
  u.searchParams.set("q", query.trim().slice(0, 400));
  u.searchParams.set("api_key", key);
  const r = await fetch(u.toString());
  if (!r.ok) return [];
  const j: unknown = await r.json().catch(() => null);
  const hits: WebSearchHit[] = [];
  const org = isRecord(j) ? j.organic_results : null;
  if (Array.isArray(org)) {
    for (const item of org.slice(0, count)) {
      if (!isRecord(item)) continue;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const snippet = typeof item.snippet === "string" ? item.snippet.trim() : "";
      const url = typeof item.link === "string" ? item.link.trim() : "";
      if ((title || snippet) && url.startsWith("http")) hits.push({ title: title || url, url, snippet });
    }
  }
  return hits;
}

async function runWebSearchHits(
  query: string,
  providerRaw: string | undefined,
  count = 5,
): Promise<{ hits: WebSearchHit[]; provider: string | null }> {
  const provider = (providerRaw ?? "").trim().toLowerCase();
  const q = query.trim().slice(0, 400);
  if (!q) return { hits: [], provider: null };
  if (provider === "brave") {
    const hits = await fetchBraveHits(q, count);
    return { hits, provider: hits.length ? "brave" : "brave" };
  }
  if (provider === "serpapi") {
    const hits = await fetchSerpApiHits(q, count);
    return { hits, provider: hits.length ? "serpapi" : "serpapi" };
  }
  return { hits: [], provider: null };
}

async function runWebSearch(
  query: string,
  providerRaw: string | undefined,
): Promise<{ text: string; provider: string | null }> {
  const provider = (providerRaw ?? "").trim().toLowerCase();
  if (provider === "brave" && !Deno.env.get("BRAVE_SEARCH_API_KEY") && !Deno.env.get("BRAVE_API_KEY")) {
    return { text: "(Brave search configured but API key missing.)", provider: "brave" };
  }
  if (provider === "serpapi" && !Deno.env.get("SERPAPI_API_KEY")) {
    return { text: "(SerpAPI configured but SERPAPI_API_KEY missing.)", provider: "serpapi" };
  }
  const { hits, provider: p } = await runWebSearchHits(query, providerRaw, 5);
  if (!p) return { text: "", provider: null };
  if (!hits.length) {
    return { text: `(No ${p} results parsed.)`, provider: p };
  }
  return { text: formatWebSearchHits(hits), provider: p };
}

export type DiscoveredSourceKind = "youtube" | "article" | "book" | "study";

export type DiscoveredSource = {
  kind: DiscoveredSourceKind;
  title: string;
  url: string;
  snippet?: string;
};

function normalizeDiscoveryUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

export function classifyDiscoveredSource(url: string, title: string): DiscoveredSourceKind {
  const u = url.toLowerCase();
  const t = title.toLowerCase();
  if (/youtube\.com|youtu\.be/.test(u)) return "youtube";
  if (
    /scholar\.google|jstor\.org|ncbi\.nlm|doi\.org|academia\.edu|ssrn\.com|researchgate\.net|\.edu\/.*paper/i.test(u)
  ) {
    return "study";
  }
  if (
    /goodreads|amazon\.|christianbook\.com|books\.google|openlibrary\.org|banneroftruth|crossway|ivpress|zondervan|tyndale|bakerbooks|thegospelcoalition\.org\/books/i.test(u)
  ) {
    return "book";
  }
  if (/\b(book|books)\b/.test(t) && !/youtube/.test(u)) return "book";
  return "article";
}

async function discoverSources(
  researchText: string,
  userQuestion: string,
  providerRaw: string | undefined,
): Promise<{
  sources: DiscoveredSource[];
  snippetText: string;
  usedWeb: boolean;
  provider: string | null;
  queries: string[];
}> {
  const provider = providerRaw?.trim().toLowerCase();
  if (!provider || provider === "none" || provider === "off") {
    return { sources: [], snippetText: "", usedWeb: false, provider: null, queries: [] };
  }

  const base = researchText.replace(/\s+/g, " ").trim().slice(0, 160);
  const extra = userQuestion.trim().slice(0, 80);
  const topic = extra ? `${base} ${extra}` : base;
  const queries = [
    `${topic} site:youtube.com`,
    `${topic} Christian theology teaching sermon`,
    `${topic} book author Christian theology`,
    `${topic} scholarly article study theology`,
  ];

  const seen = new Set<string>();
  const sources: DiscoveredSource[] = [];
  const blocks: string[] = [];
  let usedWeb = false;

  for (const q of queries) {
    const { hits } = await runWebSearchHits(q, provider, 6);
    if (hits.length) {
      usedWeb = true;
      blocks.push(`### Query: ${q}\n\n${formatWebSearchHits(hits)}`);
    }
    for (const h of hits) {
      const key = normalizeDiscoveryUrl(h.url);
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({
        kind: classifyDiscoveredSource(h.url, h.title),
        title: h.title,
        url: h.url,
        snippet: h.snippet || undefined,
      });
      if (sources.length >= 24) break;
    }
    if (sources.length >= 24) break;
  }

  return {
    sources,
    snippetText: blocks.join("\n\n---\n\n"),
    usedWeb,
    provider: usedWeb ? provider : null,
    queries,
  };
}

function stripEpistemicLine(body: string): string {
  return body.trim().replace(/^Epistemic:\s*[\w.]+\s*(\n+|$)/i, "").trim();
}

async function runValidationWebSearches(
  claimText: string,
  userQuestion: string,
  providerRaw: string | undefined,
): Promise<{ text: string; provider: string | null; usedWeb: boolean }> {
  const provider = providerRaw?.trim().toLowerCase();
  if (!provider || provider === "none" || provider === "off") {
    return { text: "", provider: null, usedWeb: false };
  }
  const base = claimText.slice(0, 200).trim();
  const qExtra = userQuestion.trim().slice(0, 120);
  const queries = [
    `${base} Christian teacher theologian perspective`,
    `${base} Bible scripture teaching`,
    qExtra ? `${base} ${qExtra} church history context` : `${base} historical theology church history`,
  ];
  const blocks: string[] = [];
  let usedWeb = false;
  for (const q of queries) {
    const ws = await runWebSearch(q, provider);
    if (ws.text && !ws.text.startsWith("(")) {
      usedWeb = true;
      blocks.push(`### Query: ${q}\n\n${ws.text}`);
    }
  }
  return {
    text: blocks.join("\n\n---\n\n"),
    provider: blocks.length ? provider : null,
    usedWeb,
  };
}

/** Live web snippets for claim-research chat turns (my-ai-chat). */
export async function buildClaimChatWebBlock(
  claimText: string,
  userQuestion: string,
): Promise<{ block: string; usedWeb: boolean; provider: string | null }> {
  const webProviderEnv = Deno.env.get("WEB_SEARCH_PROVIDER")?.trim().toLowerCase();
  if (!webProviderEnv || webProviderEnv === "none" || webProviderEnv === "off") {
    return {
      block:
        "## Live web search\n\nNot configured on the server. Set WEB_SEARCH_PROVIDER=brave|serpapi and BRAVE_SEARCH_API_KEY or SERPAPI_API_KEY in Edge secrets.",
      usedWeb: false,
      provider: null,
    };
  }
  const ws = await runValidationWebSearches(claimText, userQuestion, webProviderEnv);
  if (!ws.usedWeb || !ws.text.trim()) {
    return {
      block:
        "## Live web search\n\nSearch ran but returned no usable snippets. Answer from the user's framework and saved research brief; note that live web results were empty.",
      usedWeb: false,
      provider: ws.provider,
    };
  }
  return {
    block:
      `## Live web search results (provider: ${ws.provider}; not vetted — cite names and links from snippets; tell the user to verify)\n\n${ws.text}`,
    usedWeb: true,
    provider: ws.provider,
  };
}

function buildValidationSystemText(lensJson: string, usedWeb: boolean): string {
  return `You are a careful research assistant validating ONE claim from a Christian journaling app.

Return ONE JSON object ONLY (no markdown fences) with keys:
- "sections": object with exactly these lens ids: ${lensJson}
- Each section value: { "body": string, "epistemic": "scripture_text"|"training_only"|"web_snippet"|"mixed"|"unknown", "voices"?: array (ONLY on independent_voices) }

Lens rules:
1) bible_alignment: Compare the claim to Scripture using ONLY the "Fetched passage text" section when present. State alignment (supports / tensions / unclear) with verse refs from fetched text. If no passage text, say so and use careful general biblical themes with epistemic "training_only" or "unknown". epistemic "scripture_text" only when fetched passages were used.
2) historical_context: Era, church-historical streams, cultural background. Use web snippets when supplied (epistemic "web_snippet" or "mixed"); otherwise training_only with explicit limits.
3) independent_voices: Provide EXACTLY three distinct voices in the "voices" array AND a short "body" markdown summary. Each voice:
   { "name": string, "tradition_or_role": string, "angle": string, "summary": string, "agreement": "agrees"|"qualifies"|"disagrees"|"unclear", "source_url"?: string (only if present in web snippets), "epistemic": "web_snippet"|"training_only" }
   Voices must be plausibly real teachers, scholars, or named traditions — not fictional. Prefer different angles (e.g. one devotional teacher, one academic, one historical stream). If web snippets name people, use them and set epistemic web_snippet with URLs only from snippets.
   If NO web snippets: still name well-known figures but set epistemic training_only; body must say these are model-recalled summaries, not verified live quotes.
${usedWeb ? "4) Web snippets and Discovered sources were retrieved — prioritize them for independent_voices when they name teachers, videos, or articles. Use source URLs only from Discovered sources or web snippets." : "4) No live web search — independent_voices must flag training_only and avoid fake URLs."}
Never invent URLs, book pages, or direct quotes not grounded in supplied text.
Tone: warm, precise, non-preachy.`;
}

function buildStandardSystemText(lensJson: string): string {
  return `You are a careful research assistant for a private Christian journaling app.

Return ONE JSON object ONLY (no markdown fences) with key "sections" whose value is an object.

Each requested lens id must appear exactly once under "sections" with shape:
{ "body": string, "epistemic": "training_only" | "scripture_text" | "web_snippet" | "mixed" | "unknown" }

Lens ids for this run (only these keys): ${lensJson}

Rules:
1) scripture_context: Base analysis ONLY on the "Fetched passage text" section supplied by the server. epistemic must be "scripture_text" if any passage text was supplied; otherwise "unknown". Explicitly state that the app does not yet run Strong's or licensed concordance data; plain-text context only.
2) For every OTHER lens (non-scripture_context): body MUST begin with its own first line exactly:
   Epistemic: training_only
   or
   Epistemic: unknown
   (Pick training_only when reasoning from model training data; unknown when you cannot ground an answer.)
3) Never invent book titles, page numbers, journal volumes, or URLs not present in the user payload. If a "Discovered sources" section lists real URLs, you may reference those titles/URLs in synthesis and historical_theology — nowhere else unless the URL appeared in web snippets.
4) If web snippets and Discovered sources were NOT provided or are empty, the second paragraph (after the epistemic line) must clearly say answers may omit recent scholarship and are limited to general training-data knowledge.
5) historical_theology: major streams and cautions, no fake citations.
6) opposing_views: steel-man counterpositions.
7) denominational_notes: high-level patterns only; no database of official positions.
8) logical_audit: premises/conclusions/ gaps.
9) scientific_relevance: only when plausibly relevant to the claim; otherwise briefly say N/A.
10) synthesis: short honest integration across lenses; epistemic line as for other non-scripture sections.

Tone: warm, precise, non-preachy.`;
}

export type ResearchPackResult = {
  pack_type: PackType;
  sections: Record<string, { body: string; epistemic: string; voices?: IndependentVoice[] }>;
  independent_voices: IndependentVoice[] | null;
  discovered_sources: DiscoveredSource[];
  research_conclusion: string | null;
  scripture: ScriptureEntry[];
  meta: {
    bible_id: string;
    used_web: boolean;
    web_provider: string | null;
    discovery_count: number;
    discovery_queries: string[];
    lenses: LensId[];
    pack_type: PackType;
    user_question: string | null;
    ref_parse_errors: { ref: string; error: string }[];
  };
};

export type GenerateResearchPackInput = {
  supabaseUrl: string;
  anonKey: string;
  geminiApiKey: string;
  packType: PackType;
  useWeb: boolean;
  userQuestion: string;
  lensList: LensId[];
  /** Primary text under research (claim or hard question). */
  researchText: string;
  /** Extra lines appended to the user payload before scripture/web blocks. */
  contextLines: string[];
  refStrings: string[];
  /** Custom web search query for standard packs (defaults to researchText). */
  webSearchQuery?: string;
};

export async function generateResearchPack(
  input: GenerateResearchPackInput,
): Promise<{ ok: true; data: ResearchPackResult } | { ok: false; error: string; status: number }> {
  const {
    supabaseUrl,
    anonKey,
    geminiApiKey,
    packType,
    useWeb,
    userQuestion,
    lensList,
    researchText,
    contextLines,
    refStrings,
    webSearchQuery,
  } = input;

  const envBible = Deno.env.get("CLAIM_RESEARCH_DEFAULT_BIBLE_ID")?.trim();
  const bibleId = envBible && envBible.length > 4
    ? envBible
    : (await fetchDefaultBibleId(supabaseUrl, anonKey)) ?? "";
  if (!bibleId) {
    return { ok: false, error: "Could not resolve a Bible translation id (bibles list empty).", status: 502 };
  }

  const { block: scriptureBlock, entries: scriptureEntries } = await gatherScripture(
    supabaseUrl,
    anonKey,
    bibleId,
    refStrings.slice(0, 14),
  );

  const webProviderEnv = Deno.env.get("WEB_SEARCH_PROVIDER")?.trim().toLowerCase();
  let webSnippets = "";
  let usedWeb = false;
  let webProviderUsed: string | null = null;
  let discoveredSources: DiscoveredSource[] = [];
  let discoveryQueries: string[] = [];

  if (useWeb && webProviderEnv && webProviderEnv !== "none" && webProviderEnv !== "off") {
    const discovery = await discoverSources(researchText, userQuestion, webProviderEnv);
    discoveredSources = discovery.sources;
    discoveryQueries = discovery.queries;
    if (discovery.usedWeb) {
      usedWeb = true;
      webProviderUsed = discovery.provider;
      webSnippets = discovery.snippetText;
    }

    if (packType === "validation") {
      const ws = await runValidationWebSearches(researchText, userQuestion, webProviderEnv);
      if (ws.usedWeb) {
        usedWeb = true;
        webProviderUsed = ws.provider ?? webProviderUsed;
        webSnippets = [webSnippets, ws.text].filter(Boolean).join("\n\n---\n\n");
      }
    } else if (!discovery.usedWeb) {
      const q = (webSearchQuery ?? `${researchText.slice(0, 280)} theology interpretation`).trim();
      const ws = await runWebSearch(q, webProviderEnv);
      webSnippets = ws.text;
      usedWeb = Boolean(ws.text && !ws.text.startsWith("("));
      webProviderUsed = ws.provider;
    }
  }

  const discoveryBlock = discoveredSources.length
    ? [
      "## Discovered sources (live search; not vetted — verify before citing)",
      "",
      ...discoveredSources.map((s) =>
        `- [${s.kind}] **${s.title}** (${s.url})${s.snippet ? `\n  ${s.snippet}` : ""}`
      ),
    ].join("\n")
    : "";

  const webBlock = usedWeb
    ? [
      `## Retrieved web snippets (provider: ${webProviderUsed}; not vetted)`,
      "",
      webSnippets,
      discoveryBlock ? `\n\n${discoveryBlock}` : "",
    ].join("\n")
    : `## Web search\n\nNot used for this request (claim_research.use_web=false or WEB_SEARCH_PROVIDER unset). Live search requires WEB_SEARCH_PROVIDER=brave|serpapi and BRAVE_SEARCH_API_KEY or SERPAPI_API_KEY in Edge secrets.`;

  const lensJson = JSON.stringify(lensList);
  const systemText = packType === "validation"
    ? buildValidationSystemText(lensJson, usedWeb)
    : buildStandardSystemText(lensJson);

  const userPayload = [
    `pack_type: ${packType}`,
    userQuestion ? `user_question:\n${userQuestion}` : "",
    `research_text:\n${researchText}`,
    ...contextLines,
    "",
    scriptureBlock,
    "",
    webBlock,
  ].filter(Boolean).join("\n");

  const gem = await callGeminiJson(systemText, userPayload, geminiApiKey);
  if (!gem.ok) return { ok: false, error: gem.err ?? "Gemini failed", status: 502 };

  type SectionOut = { body: string; epistemic: Epistemic; voices?: IndependentVoice[] };
  const sectionsOut: Record<string, SectionOut> = {};
  try {
    const parsed: unknown = JSON.parse(stripJsonFence(gem.rawText));
    if (isRecord(parsed) && isRecord(parsed.sections)) {
      for (const lid of lensList) {
        const cell = parsed.sections[lid];
        if (!isRecord(cell)) continue;
        const body = typeof cell.body === "string" ? cell.body.trim() : "";
        const ep = typeof cell.epistemic === "string" ? cell.epistemic.trim() : "";
        if (body && isEpistemic(ep)) {
          const entry: SectionOut = { body, epistemic: ep };
          if (lid === "independent_voices") {
            const voices = parseIndependentVoices(cell);
            if (voices?.length) entry.voices = voices;
          }
          sectionsOut[lid] = entry;
        }
      }
    }
  } catch {
    /* fallthrough */
  }

  if (Object.keys(sectionsOut).length === 0) {
    return { ok: false, error: "Model returned unusable JSON for sections.", status: 502 };
  }

  const hasScriptureText = scriptureEntries.some((e) => e.text && e.text.trim().length > 0);
  for (const lid of lensList) {
    if (sectionsOut[lid]) continue;
    if (lid === "scripture_context" || lid === "bible_alignment") {
      if (hasScriptureText) {
        sectionsOut[lid] = {
          epistemic: "scripture_text",
          body:
            (lid === "bible_alignment"
              ? "Alignment notes from fetched passage text (API.Bible). Strong's / lexicons not wired in v1.\n\n"
              : "Concordance / Hebrew–Greek: This app does not yet run Strong's or licensed lexicons. Plain-text context from the user's cited passages (API.Bible) follows.\n\n") +
            scriptureBlock.slice(0, 7000),
        };
      } else {
        sectionsOut[lid] = {
          epistemic: "unknown",
          body:
            "No usable passage text was retrieved (unparsed references, API errors, or no refs). Add scripture refs or ask a follow-up with broader context enabled.",
        };
      }
      continue;
    }
    if (lid === "independent_voices") {
      sectionsOut[lid] = {
        epistemic: usedWeb ? "mixed" : "training_only",
        body: usedWeb
          ? "Could not parse three independent voices from the model. Retry, or check web search configuration."
          : "Epistemic: training_only\n\nLive web search was off or unavailable. Three-voice validation requires named teachers from model training data only — not verified live quotes. Enable web search in Edge secrets and the toggle, then retry.",
      };
      continue;
    }
    sectionsOut[lid] = {
      epistemic: "unknown",
      body:
        "Epistemic: unknown\n\nThis section was missing from the model response after a successful parse. Retry the research pack, or continue in chat.",
    };
  }
  if (packType === "standard" && lensList.includes("scripture_context") && sectionsOut.scripture_context && hasScriptureText) {
    sectionsOut.scripture_context = {
      ...sectionsOut.scripture_context,
      epistemic: "scripture_text",
    };
  }
  if (packType === "validation" && lensList.includes("bible_alignment") && sectionsOut.bible_alignment && hasScriptureText) {
    sectionsOut.bible_alignment = {
      ...sectionsOut.bible_alignment,
      epistemic: "scripture_text",
    };
  }

  const independentVoices = sectionsOut.independent_voices?.voices ?? null;

  const conclusionRaw =
    sectionsOut.synthesis?.body?.trim() ||
    sectionsOut.bible_alignment?.body?.trim() ||
    null;
  const researchConclusion = conclusionRaw ? stripEpistemicLine(conclusionRaw) : null;

  return {
    ok: true,
    data: {
      pack_type: packType,
      sections: sectionsOut,
      independent_voices: independentVoices,
      discovered_sources: discoveredSources,
      research_conclusion: researchConclusion,
      scripture: scriptureEntries,
      meta: {
        bible_id: bibleId,
        used_web: usedWeb,
        web_provider: webProviderUsed,
        discovery_count: discoveredSources.length,
        discovery_queries: discoveryQueries,
        lenses: lensList,
        pack_type: packType,
        user_question: userQuestion || null,
        ref_parse_errors: scriptureEntries.filter((e) => e.error).map((e) => ({ ref: e.ref, error: e.error! })),
      },
    },
  };
}
