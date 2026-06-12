/**
 * bible-life-guide — find Scripture for a life issue and return literal, practical instruction.
 * Actions: search (initial guide), followup (dig deeper on the same guide).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EOTC_BIBLE_ID = "eotc-am-81";
const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const BOOK_NAME_TO_ABBR: Record<string, string> = {
  genesis: "Gen", exodus: "Exo", leviticus: "Lev", numbers: "Num", deuteronomy: "Deu",
  joshua: "Jos", judges: "Jdg", ruth: "Rut",
  "1 samuel": "1Sa", "2 samuel": "2Sa", "1 kings": "1Ki", "2 kings": "2Ki",
  "1 chronicles": "1Ch", "2 chronicles": "2Ch",
  ezra: "Ezr", nehemiah: "Neh", esther: "Est",
  job: "Job", psalm: "Psa", psalms: "Psa", proverbs: "Pro", ecclesiastes: "ECC",
  "song of solomon": "Sng", isaiah: "Isa", jeremiah: "Jer", lamentations: "Lam",
  ezekiel: "Ezk", daniel: "Dan",
  hosea: "Hos", joel: "Jol", amos: "Amo", obadiah: "Oba", jonah: "Jon",
  micah: "Mic", nahum: "Nam", habakkuk: "Hab", zephaniah: "Zep", haggai: "Hag",
  zechariah: "Zec", malachi: "Mal",
  matthew: "Mat", mark: "Mrk", luke: "Luk", john: "Jhn", acts: "Act",
  romans: "Rom", "1 corinthians": "1Co", "2 corinthians": "2Co", galatians: "Gal",
  ephesians: "Eph", philippians: "Php", colossians: "Col",
  "1 thessalonians": "1Th", "2 thessalonians": "2Th",
  "1 timothy": "1Ti", "2 timothy": "2Ti", titus: "Tit", philemon: "Phm",
  hebrews: "Heb", james: "Jas", "1 peter": "1Pe", "2 peter": "2Pe",
  "1 john": "1Jn", "2 john": "2Jn", "3 john": "3Jn", jude: "Jud", revelation: "Rev",
  matt: "Mat", mk: "Mrk", lk: "Luk", jn: "Jhn", rom: "Rom", rev: "Rev",
};

function normalizeBookAbbr(book: string): string {
  const trimmed = book.trim();
  if (/^\d?[A-Za-z]{1,3}$/.test(trimmed)) return trimmed;
  const key = trimmed.toLowerCase().replace(/\./g, "");
  return BOOK_NAME_TO_ABBR[key] ?? trimmed;
}

interface SearchHit {
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

interface GuidePassage {
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  literal_meaning: string;
  do_this: string;
}

interface LifeGuideResult {
  topic: string;
  summary: string;
  passages: GuidePassage[];
  action_steps: string[];
  prayer: string;
}

interface FollowUpTurn {
  question: string;
  answer: string;
}

function parseReference(ref: string): { book: string; chapter: number; verse: number } | null {
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)/);
  if (!m) return null;
  return { book: m[1].trim(), chapter: parseInt(m[2], 10), verse: parseInt(m[3], 10) };
}

function hitKey(h: Pick<SearchHit, "book" | "chapter" | "verse">): string {
  return `${h.book}:${h.chapter}:${h.verse}`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function searchBible(
  supabaseUrl: string,
  anonKey: string,
  bibleId: string,
  query: string,
  limit = 8,
): Promise<SearchHit[]> {
  const u = new URL(`${supabaseUrl}/functions/v1/bible-search`);
  u.searchParams.set("bibleId", bibleId);
  u.searchParams.set("q", query);
  u.searchParams.set("limit", String(limit));
  const r = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
  });
  if (!r.ok) return [];
  const json = await r.json();
  return (json?.results ?? []) as SearchHit[];
}

async function fetchVerseText(
  supabaseUrl: string,
  anonKey: string,
  bibleId: string,
  book: string,
  chapter: number,
  verse: number,
): Promise<string> {
  const u = new URL(`${supabaseUrl}/functions/v1/bible-passage`);
  u.searchParams.set("bibleId", bibleId);
  u.searchParams.set("book", book);
  u.searchParams.set("chapter", String(chapter));
  const r = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
  });
  if (!r.ok) return "";
  const json = await r.json();
  const verses = (json?.verses ?? []) as Array<{ number: number; text: string }>;
  const v = verses.find((x) => x.number === verse);
  return v?.text?.trim() ?? "";
}

async function geminiJson(
  apiKey: string,
  prompt: string,
  toolName: string,
  schema: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const r = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      tools: [{
        type: "function",
        function: { name: toolName, parameters: schema },
      }],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI gateway ${r.status}: ${t.slice(0, 300)}`);
  }
  const j = await r.json();
  const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
  return JSON.parse(args);
}

async function gatherScripture(
  supabaseUrl: string,
  anonKey: string,
  bibleId: string,
  issue: string,
  isEotc: boolean,
  extraQueries: string[] = [],
): Promise<{ topic: string; gathered: SearchHit[] }> {
  const discover = await geminiJson(
    Deno.env.get("GEMINI_API_KEY")!,
    `The user wants the Bible as a literal instruction manual for life. They described this issue:

"${issue}"

${isEotc
  ? "Their Bible is the Ethiopian Orthodox 81-book canon (Amharic). Suggest 6-10 specific scripture references (Book Chapter:Verse) that directly address this issue. Use standard English book names."
  : "Suggest 4-6 keyword phrases to search in a Bible API (2-4 words each). Also suggest 3-5 specific scripture references you are confident address this issue."}

Be practical — they want what to DO, not theology essays.`,
    "discover_scripture",
    {
      type: "object",
      properties: {
        topic: { type: "string" },
        search_queries: { type: "array", items: { type: "string" } },
        scripture_refs: { type: "array", items: { type: "string" } },
      },
      required: ["topic", "search_queries", "scripture_refs"],
    },
  );

  const topic = String(discover.topic ?? "Life issue").slice(0, 120);
  const searchQueries = [
    ...extraQueries,
    ...((discover.search_queries ?? []) as string[]),
  ].map((q) => q.trim()).filter(Boolean).slice(0, 8);
  const suggestedRefs = ((discover.scripture_refs ?? []) as string[])
    .map((r) => r.trim()).filter(Boolean).slice(0, 10);

  const seen = new Set<string>();
  const gathered: SearchHit[] = [];

  if (!isEotc) {
    for (const q of searchQueries) {
      const hits = await searchBible(supabaseUrl, anonKey, bibleId, q, 6);
      for (const h of hits) {
        const key = hitKey(h);
        if (!seen.has(key) && h.text) {
          seen.add(key);
          gathered.push(h);
        }
      }
      if (gathered.length >= 20) break;
    }
  }

  for (const ref of suggestedRefs) {
    const parsed = parseReference(ref);
    if (!parsed) continue;
    const bookAbbr = normalizeBookAbbr(parsed.book);
    const key = `${bookAbbr}:${parsed.chapter}:${parsed.verse}`;
    if (seen.has(key)) continue;
    const text = await fetchVerseText(supabaseUrl, anonKey, bibleId, bookAbbr, parsed.chapter, parsed.verse);
    if (!text) continue;
    seen.add(key);
    gathered.push({ reference: ref, book: bookAbbr, chapter: parsed.chapter, verse: parsed.verse, text });
    if (gathered.length >= 24) break;
  }

  return { topic, gathered };
}

function mapGuidePassages(
  guide: Record<string, unknown>,
  gathered: SearchHit[],
): GuidePassage[] {
  const textByRef = new Map(gathered.map((h) => [h.reference.toLowerCase(), h]));
  const textByKey = new Map(gathered.map((h) => [hitKey(h), h]));
  return ((guide.passages ?? []) as Array<Record<string, unknown>>)
    .map((p) => {
      const ref = String(p.reference ?? "");
      const book = String(p.book ?? "");
      const chapter = Number(p.chapter) || 1;
      const verse = Number(p.verse) || 1;
      const hit = textByRef.get(ref.toLowerCase()) ?? textByKey.get(`${book}:${chapter}:${verse}`);
      const text = hit?.text ?? String(p.text ?? "");
      if (!text) return null;
      return {
        reference: hit?.reference ?? ref,
        book: hit?.book ?? book,
        chapter: hit?.chapter ?? chapter,
        verse: hit?.verse ?? verse,
        text,
        literal_meaning: String(p.literal_meaning ?? "").slice(0, 1200),
        do_this: String(p.do_this ?? "").slice(0, 600),
      };
    })
    .filter((x): x is GuidePassage => x != null)
    .slice(0, 8);
}

async function handleSearch(
  apiKey: string,
  supabaseUrl: string,
  anonKey: string,
  issue: string,
  bibleId: string,
): Promise<Response> {
  const isEotc = bibleId === EOTC_BIBLE_ID;
  const { topic, gathered } = await gatherScripture(supabaseUrl, anonKey, bibleId, issue, isEotc);

  if (gathered.length === 0) {
    return jsonResponse({
      error: "Could not find matching Scripture. Try rephrasing your issue or check your Bible translation.",
    }, 404);
  }

  const passageBlock = gathered
    .slice(0, 18)
    .map((h) => `[${h.reference}] (book=${h.book}, ch=${h.chapter}, v=${h.verse})\n"${h.text}"`)
    .join("\n\n");

  const guide = await geminiJson(
    apiKey,
    `You are helping someone use the Bible as a literal instruction manual for life.

THEIR ISSUE:
"${issue}"

TOPIC: ${topic}

SCRIPTURE PASSAGES (use ONLY these — do not invent or quote verses not listed):
${passageBlock}

Instructions:
- Take Scripture at face value as God's instruction for this specific problem.
- For each passage you include, explain what it literally commands or teaches about their situation.
- Give concrete "do this" steps — specific actions for today and this week.
- Be direct and practical, not preachy or vague.
- Pick the 4-7 most relevant passages (not all of them).
- action_steps must be derived directly from the passages you select.
- prayer should be short, rooted in the text, using "you" addressing God.`,
    "submit_life_guide",
    {
      type: "object",
      properties: {
        summary: { type: "string" },
        passages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              reference: { type: "string" },
              book: { type: "string" },
              chapter: { type: "number" },
              verse: { type: "number" },
              text: { type: "string" },
              literal_meaning: { type: "string" },
              do_this: { type: "string" },
            },
            required: ["reference", "book", "chapter", "verse", "literal_meaning", "do_this"],
          },
        },
        action_steps: { type: "array", items: { type: "string" } },
        prayer: { type: "string" },
      },
      required: ["summary", "passages", "action_steps", "prayer"],
    },
  );

  const passages = mapGuidePassages(guide, gathered);
  if (passages.length === 0) {
    return jsonResponse({ error: "Could not build a guide from Scripture. Try again." }, 502);
  }

  const result: LifeGuideResult = {
    topic,
    summary: String(guide.summary ?? "").slice(0, 1200),
    passages,
    action_steps: ((guide.action_steps ?? []) as string[]).map((s) => s.trim()).filter(Boolean).slice(0, 8),
    prayer: String(guide.prayer ?? "").slice(0, 800),
  };

  return jsonResponse(result);
}

async function handleFollowup(
  apiKey: string,
  supabaseUrl: string,
  anonKey: string,
  issue: string,
  bibleId: string,
  question: string,
  guide: LifeGuideResult,
  history: FollowUpTurn[],
): Promise<Response> {
  const isEotc = bibleId === EOTC_BIBLE_ID;
  const knownKeys = new Set(guide.passages.map((p) => hitKey(p)));

  let extraHits: SearchHit[] = [];
  if (!isEotc) {
    const hits = await searchBible(supabaseUrl, anonKey, bibleId, question, 8);
    extraHits = hits.filter((h) => !knownKeys.has(hitKey(h)) && h.text).slice(0, 4);
  }

  const existingBlock = guide.passages
    .map((p) => `[${p.reference}] "${p.text}"\nLiteral: ${p.literal_meaning}\nDo: ${p.do_this}`)
    .join("\n\n");

  const extraBlock = extraHits
    .map((h) => `[${h.reference}] "${h.text}"`)
    .join("\n\n");

  const historyBlock = history
    .map((t) => `Q: ${t.question}\nA: ${t.answer}`)
    .join("\n\n");

  const reply = await geminiJson(
    apiKey,
    `You are helping someone dig deeper into Scripture as a literal life manual.

ORIGINAL ISSUE: "${issue}"
TOPIC: ${guide.topic}
GUIDE SUMMARY: ${guide.summary}

PASSAGES ALREADY IN THE GUIDE:
${existingBlock}

${extraBlock ? `ADDITIONAL PASSAGES FOUND FOR THIS FOLLOW-UP:\n${extraBlock}\n` : ""}
${historyBlock ? `PRIOR FOLLOW-UP TURNS:\n${historyBlock}\n` : ""}

USER'S FOLLOW-UP QUESTION:
"${question}"

Answer literally and practically:
- Ground every claim in the passages above (existing or additional). Do not invent verse text.
- If they ask "what should I do about X", give a concrete action.
- If they ask to clarify a verse, explain the plain literal meaning for their situation.
- Be direct; 2-5 short paragraphs max.
- If additional passages are relevant, include up to 2 in new_passages with literal_meaning and do_this.`,
    "submit_followup",
    {
      type: "object",
      properties: {
        answer: { type: "string" },
        action_hint: { type: "string", description: "One concrete thing to do today, or empty" },
        new_passages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              reference: { type: "string" },
              book: { type: "string" },
              chapter: { type: "number" },
              verse: { type: "number" },
              literal_meaning: { type: "string" },
              do_this: { type: "string" },
            },
            required: ["reference", "book", "chapter", "verse", "literal_meaning", "do_this"],
          },
        },
      },
      required: ["answer"],
    },
  );

  const textByRef = new Map(extraHits.map((h) => [h.reference.toLowerCase(), h]));
  const textByKey = new Map(extraHits.map((h) => [hitKey(h), h]));

  const newPassages: GuidePassage[] = ((reply.new_passages ?? []) as Array<Record<string, unknown>>)
    .map((p) => {
      const ref = String(p.reference ?? "");
      const book = String(p.book ?? "");
      const chapter = Number(p.chapter) || 1;
      const verse = Number(p.verse) || 1;
      const hit = textByRef.get(ref.toLowerCase()) ?? textByKey.get(`${book}:${chapter}:${verse}`);
      const text = hit?.text ?? "";
      if (!text) return null;
      return {
        reference: hit.reference,
        book: hit.book,
        chapter: hit.chapter,
        verse: hit.verse,
        text,
        literal_meaning: String(p.literal_meaning ?? "").slice(0, 1200),
        do_this: String(p.do_this ?? "").slice(0, 600),
      };
    })
    .filter((x): x is GuidePassage => x != null)
    .slice(0, 2);

  return jsonResponse({
    answer: String(reply.answer ?? "").slice(0, 4000),
    action_hint: typeof reply.action_hint === "string" ? reply.action_hint.slice(0, 600) : "",
    new_passages: newPassages,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON) {
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as {
      action?: string;
      issue?: string;
      bibleId?: string;
      question?: string;
      guide?: LifeGuideResult;
      history?: FollowUpTurn[];
    };

    const action = body.action === "followup" ? "followup" : "search";
    const bibleId = body.bibleId?.trim();
    if (!bibleId) return jsonResponse({ error: "bibleId is required" }, 400);

    if (action === "followup") {
      const issue = body.issue?.trim().slice(0, 2000);
      const question = body.question?.trim().slice(0, 1000);
      const guide = body.guide;
      if (!issue || !question || !guide?.passages?.length) {
        return jsonResponse({ error: "issue, question, and guide are required for followup" }, 400);
      }
      const history = Array.isArray(body.history)
        ? body.history
          .filter((t) => t?.question && t?.answer)
          .slice(-6)
          .map((t) => ({
            question: String(t.question).slice(0, 1000),
            answer: String(t.answer).slice(0, 4000),
          }))
        : [];
      return await handleFollowup(
        GEMINI_API_KEY,
        SUPABASE_URL,
        SUPABASE_ANON,
        issue,
        bibleId,
        question,
        guide,
        history,
      );
    }

    const issue = body.issue?.trim().slice(0, 2000);
    if (!issue) return jsonResponse({ error: "issue is required" }, 400);
    return await handleSearch(GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON, issue, bibleId);
  } catch (e) {
    console.error("bible-life-guide error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
