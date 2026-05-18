/**
 * claim-research-pack — v1 structured research for a single artifact claim.
 *
 * OUT OF SCOPE FOR V1 (not implemented here; do not imply otherwise in prompts):
 * - Licensed concordance / Strong's lexicons
 * - Theology PDF corpora or proprietary denominational databases
 * - Automated live denominational stance APIs
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";

const DEFAULT_LENS_IDS = [
  "scripture_context",
  "historical_theology",
  "opposing_views",
  "denominational_notes",
  "logical_audit",
  "scientific_relevance",
  "synthesis",
] as const;

type LensId = (typeof DEFAULT_LENS_IDS)[number];
type Epistemic = "training_only" | "scripture_text" | "unknown";

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
  const s = raw.trim().replace(/^[\[(<"'`]+|[\])>"'`]+$/g, "").trim();
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

function extractRefsFromText(text: string, max: number): string[] {
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
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

function isLensId(s: string): s is LensId {
  return (DEFAULT_LENS_IDS as readonly string[]).includes(s);
}

function isEpistemic(s: string): s is Epistemic {
  return s === "training_only" || s === "scripture_text" || s === "unknown";
}

type ScriptureEntry = { ref: string; reference?: string; text?: string; error?: string };

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

async function runWebSearch(
  query: string,
  providerRaw: string | undefined,
): Promise<{ text: string; provider: string | null }> {
  const provider = (providerRaw ?? "").trim().toLowerCase();
  const q = query.trim().slice(0, 400);
  if (!q) return { text: "", provider: null };

  if (provider === "brave") {
    const key = Deno.env.get("BRAVE_SEARCH_API_KEY") ?? Deno.env.get("BRAVE_API_KEY");
    if (!key) return { text: "(Brave search configured but API key missing.)", provider: "brave" };
    const u = new URL("https://api.search.brave.com/res/v1/web/search");
    u.searchParams.set("q", q);
    u.searchParams.set("count", "5");
    const r = await fetch(u.toString(), { headers: { Accept: "application/json", "X-Subscription-Token": key } });
    if (!r.ok) return { text: `(Brave search failed: HTTP ${r.status})`, provider: "brave" };
    const j: unknown = await r.json().catch(() => null);
    const bits: string[] = [];
    if (isRecord(j) && isRecord(j.web) && Array.isArray(j.web.results)) {
      for (const item of j.web.results.slice(0, 5)) {
        if (!isRecord(item)) continue;
        const title = typeof item.title === "string" ? item.title : "";
        const desc = typeof item.description === "string" ? item.description : "";
        const url = typeof item.url === "string" ? item.url : "";
        if (title || desc) bits.push(`- ${title}${url ? ` (${url})` : ""}\n  ${desc}`);
      }
    }
    return { text: bits.join("\n\n") || "(No Brave results parsed.)", provider: "brave" };
  }

  if (provider === "serpapi") {
    const key = Deno.env.get("SERPAPI_API_KEY");
    if (!key) return { text: "(SerpAPI configured but SERPAPI_API_KEY missing.)", provider: "serpapi" };
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google");
    u.searchParams.set("q", q);
    u.searchParams.set("api_key", key);
    const r = await fetch(u.toString());
    if (!r.ok) return { text: `(SerpAPI failed: HTTP ${r.status})`, provider: "serpapi" };
    const j: unknown = await r.json().catch(() => null);
    const bits: string[] = [];
    const org = isRecord(j) ? j.organic_results : null;
    if (Array.isArray(org)) {
      for (const item of org.slice(0, 5)) {
        if (!isRecord(item)) continue;
        const title = typeof item.title === "string" ? item.title : "";
        const snip = typeof item.snippet === "string" ? item.snippet : "";
        const link = typeof item.link === "string" ? item.link : "";
        if (title || snip) bits.push(`- ${title}${link ? ` (${link})` : ""}\n  ${snip}`);
      }
    }
    return { text: bits.join("\n\n") || "(No SerpAPI organic results parsed.)", provider: "serpapi" };
  }

  return { text: "", provider: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      return jsonResponse({ error: "Server misconfigured (Supabase env)." }, 500);
    }
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "GEMINI_API_KEY is not configured." }, 502);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const bodyRaw: unknown = await req.json().catch(() => null);
    if (!isRecord(bodyRaw)) return jsonResponse({ error: "Invalid JSON body" }, 400);

    const claimIdRaw = typeof bodyRaw.artifact_claim_id === "string" ? bodyRaw.artifact_claim_id.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(claimIdRaw)) {
      return jsonResponse({ error: "artifact_claim_id (UUID) is required" }, 400);
    }

    const claimResearch = isRecord(bodyRaw.claim_research) ? bodyRaw.claim_research : null;
    const useWeb = claimResearch?.use_web === true;

    let lensesIn: unknown = bodyRaw.lenses;
    let lensList: LensId[] = [...DEFAULT_LENS_IDS];
    if (Array.isArray(lensesIn)) {
      const picked = lensesIn
        .filter((x): x is string => typeof x === "string" && isLensId(x.trim()))
        .map((x) => x.trim() as LensId);
      if (picked.length) lensList = [...new Set(picked)];
    }

    const { data: claimRow, error: clErr } = await supabase
      .from("artifact_claims")
      .select(
        "id, artifact_id, claim, tone, doctrine_tags, bias_flags, scripture_supports, scripture_challenges, user_id, chapter_start_seconds",
      )
      .eq("id", claimIdRaw)
      .maybeSingle();
    if (clErr) return jsonResponse({ error: clErr.message }, 502);
    if (!claimRow || claimRow.user_id !== userId) {
      return jsonResponse({ error: "Claim not found" }, 404);
    }

    const { data: artRow, error: artErr } = await supabase
      .from("artifacts")
      .select("id, title, kind, url, raw_text, user_id, metadata")
      .eq("id", claimRow.artifact_id as string)
      .maybeSingle();
    if (artErr) return jsonResponse({ error: artErr.message }, 502);
    if (!artRow || artRow.user_id !== userId) {
      return jsonResponse({ error: "Artifact not found for claim" }, 404);
    }

    const claimText = typeof claimRow.claim === "string" ? claimRow.claim : "";
    const rawText = typeof artRow.raw_text === "string" ? artRow.raw_text : "";
    const transcriptExcerpt = rawText ? rawText.replace(/\s+/g, " ").trim().slice(0, 2400) : "";

    const supList = Array.isArray(claimRow.scripture_supports) ? claimRow.scripture_supports as unknown[] : [];
    const chList = Array.isArray(claimRow.scripture_challenges) ? claimRow.scripture_challenges as unknown[] : [];
    const refStrings: string[] = [];
    const pushRef = (r: string) => {
      const t = r.trim();
      if (t && !refStrings.includes(t)) refStrings.push(t);
    };
    for (const row of supList) {
      if (isRecord(row) && typeof row.ref === "string") pushRef(row.ref);
    }
    for (const row of chList) {
      if (isRecord(row) && typeof row.ref === "string") pushRef(row.ref);
    }
    for (const guess of extractRefsFromText(claimText, 8)) pushRef(guess);

    const envBible = Deno.env.get("CLAIM_RESEARCH_DEFAULT_BIBLE_ID")?.trim();
    const bibleId = envBible && envBible.length > 4
      ? envBible
      : (await fetchDefaultBibleId(SUPABASE_URL, SUPABASE_ANON)) ?? "";
    if (!bibleId) {
      return jsonResponse({ error: "Could not resolve a Bible translation id (bibles list empty)." }, 502);
    }

    const { block: scriptureBlock, entries: scriptureEntries } = await gatherScripture(
      SUPABASE_URL,
      SUPABASE_ANON,
      bibleId,
      refStrings.slice(0, 14),
    );

    const webProviderEnv = Deno.env.get("WEB_SEARCH_PROVIDER")?.trim().toLowerCase();
    let webSnippets = "";
    let usedWeb = false;
    let webProviderUsed: string | null = null;
    if (useWeb && webProviderEnv && webProviderEnv !== "none" && webProviderEnv !== "off") {
      const q = `${claimText.slice(0, 280)} theology interpretation`;
      const ws = await runWebSearch(q, webProviderEnv);
      webSnippets = ws.text;
      usedWeb = Boolean(ws.text && !ws.text.startsWith("("));
      webProviderUsed = ws.provider;
    }

    const webBlock = usedWeb
      ? `## Retrieved web snippets (provider: ${webProviderUsed}; not vetted)\n\n${webSnippets}`
      : `## Web search\n\nNot used for this request (claim_research.use_web=false or WEB_SEARCH_PROVIDER unset).`;

    const lensJson = JSON.stringify(lensList);

    const systemText = `You are a careful research assistant for a private Christian journaling app.

Return ONE JSON object ONLY (no markdown fences) with key "sections" whose value is an object.

Each requested lens id must appear exactly once under "sections" with shape:
{ "body": string, "epistemic": "training_only" | "scripture_text" | "unknown" }

Lens ids for this run (only these keys): ${lensJson}

Rules:
1) scripture_context: Base analysis ONLY on the "Fetched passage text" section supplied by the server. epistemic must be "scripture_text" if any passage text was supplied; otherwise "unknown". Explicitly state that the app does not yet run Strong's or licensed concordance data; plain-text context only.
2) For every OTHER lens (non-scripture_context): body MUST begin with its own first line exactly:
   Epistemic: training_only
   or
   Epistemic: unknown
   (Pick training_only when reasoning from model training data; unknown when you cannot ground an answer.)
3) Never invent book titles, page numbers, journal volumes, or URLs not present in the user payload. If you did not receive web snippets with real URLs, do not fabricate citations.
4) If web snippets were NOT provided or are empty, the second paragraph (after the epistemic line) must clearly say answers may omit recent scholarship and are limited to general training-data knowledge.
5) historical_theology: major streams and cautions, no fake citations.
6) opposing_views: steel-man counterpositions.
7) denominational_notes: high-level patterns only; no database of official positions.
8) logical_audit: premises/conclusions/ gaps.
9) scientific_relevance: only when plausibly relevant to the claim; otherwise briefly say N/A.
10) synthesis: short honest integration across lenses; epistemic line as for other non-scripture sections.

Tone: warm, precise, non-preachy.`;

    const userPayload = [
      `artifact_title: ${typeof artRow.title === "string" ? artRow.title : ""}`,
      `artifact_kind: ${typeof artRow.kind === "string" ? artRow.kind : ""}`,
      `claim_text:\n${claimText}`,
      `tone: ${typeof claimRow.tone === "string" ? claimRow.tone : ""}`,
      `doctrine_tags: ${JSON.stringify(claimRow.doctrine_tags ?? [])}`,
      `bias_flags: ${JSON.stringify(claimRow.bias_flags ?? [])}`,
      `scripture_supports: ${JSON.stringify(claimRow.scripture_supports ?? [])}`,
      `scripture_challenges: ${JSON.stringify(claimRow.scripture_challenges ?? [])}`,
      `transcript_excerpt (truncated):\n${transcriptExcerpt || "(none)"}`,
      "",
      scriptureBlock,
      "",
      webBlock,
    ].join("\n");

    const gem = await callGeminiJson(systemText, userPayload, GEMINI_API_KEY);
    if (!gem.ok) return jsonResponse({ error: gem.err ?? "Gemini failed" }, 502);

    let sectionsOut: Record<string, { body: string; epistemic: Epistemic }> = {};
    try {
      const parsed: unknown = JSON.parse(stripJsonFence(gem.rawText));
      if (isRecord(parsed) && isRecord(parsed.sections)) {
        for (const lid of lensList) {
          const cell = parsed.sections[lid];
          if (!isRecord(cell)) continue;
          const body = typeof cell.body === "string" ? cell.body.trim() : "";
          const ep = typeof cell.epistemic === "string" ? cell.epistemic.trim() : "";
          if (body && isEpistemic(ep)) {
            sectionsOut[lid] = { body, epistemic: ep };
          }
        }
      }
    } catch {
      /* fallthrough */
    }

    if (Object.keys(sectionsOut).length === 0) {
      return jsonResponse({ error: "Model returned unusable JSON for sections." }, 502);
    }

    const hasScriptureText = scriptureEntries.some((e) => e.text && e.text.trim().length > 0);
    for (const lid of lensList) {
      if (sectionsOut[lid]) continue;
      if (lid === "scripture_context") {
        if (hasScriptureText) {
          sectionsOut[lid] = {
            epistemic: "scripture_text",
            body:
              "Concordance / Hebrew–Greek: This app does not yet run Strong's or licensed lexicons. Plain-text context from the user's cited passages (API.Bible) follows.\n\n" +
              scriptureBlock.slice(0, 7000),
          };
        } else {
          sectionsOut[lid] = {
            epistemic: "unknown",
            body:
              "No usable passage text was retrieved (unparsed references, API errors, or no refs). Strong's / concordance tools are not wired in v1—use the chat tab or fix scripture refs on the claim.",
          };
        }
        continue;
      }
      sectionsOut[lid] = {
        epistemic: "unknown",
        body:
          "Epistemic: unknown\n\nThis section was missing from the model response after a successful parse. Retry the research pack, or continue in chat.",
      };
    }
    if (lensList.includes("scripture_context") && sectionsOut.scripture_context && hasScriptureText) {
      sectionsOut.scripture_context = {
        ...sectionsOut.scripture_context,
        epistemic: "scripture_text",
      };
    }

    return jsonResponse({
      sections: sectionsOut,
      scripture: scriptureEntries,
      meta: {
        bible_id: bibleId,
        used_web: usedWeb,
        web_provider: webProviderUsed,
        lenses: lensList,
        ref_parse_errors: scriptureEntries.filter((e) => e.error).map((e) => ({ ref: e.ref, error: e.error })),
      },
    });
  } catch (e) {
    console.error("claim-research-pack error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
