// Picks a personalized daily passage from the user's framework and stores it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_ABBRS = new Set([
  "Gen", "Exo", "Lev", "Num", "Deu", "Jos", "Jdg", "Rut", "1Sa", "2Sa", "1Ki", "2Ki",
  "1Ch", "2Ch", "Ezr", "Neh", "Est", "Job", "Psa", "Pro", "Ecc", "Sng", "Isa", "Jer",
  "Lam", "Ezk", "Dan", "Hos", "Jol", "Amo", "Oba", "Jon", "Mic", "Nam", "Hab", "Zep",
  "Hag", "Zec", "Mal", "Mat", "Mrk", "Luk", "Jhn", "Act", "Rom", "1Co", "2Co", "Gal",
  "Eph", "Php", "Col", "1Th", "2Th", "1Ti", "2Ti", "Tit", "Phm", "Heb", "Jas", "1Pe",
  "2Pe", "1Jn", "2Jn", "3Jn", "Jud", "Rev",
]);

const BOOK_ID_MAP: Record<string, string> = {
  Gen: "GEN", Exo: "EXO", Lev: "LEV", Num: "NUM", Deu: "DEU",
  Jos: "JOS", Jdg: "JDG", Rut: "RUT",
  "1Sa": "1SA", "2Sa": "2SA", "1Ki": "1KI", "2Ki": "2KI",
  "1Ch": "1CH", "2Ch": "2CH",
  Ezr: "EZR", Neh: "NEH", Est: "EST",
  Job: "JOB", Psa: "PSA", Pro: "PRO", Ecc: "ECC", Sng: "SNG",
  Isa: "ISA", Jer: "JER", Lam: "LAM", Ezk: "EZK", Dan: "DAN",
  Hos: "HOS", Jol: "JOL", Amo: "AMO", Oba: "OBA", Jon: "JON",
  Mic: "MIC", Nam: "NAM", Hab: "HAB", Zep: "ZEP", Hag: "HAG",
  Zec: "ZEC", Mal: "MAL",
  Mat: "MAT", Mrk: "MRK", Luk: "LUK", Jhn: "JHN",
  Act: "ACT",
  Rom: "ROM", "1Co": "1CO", "2Co": "2CO", Gal: "GAL", Eph: "EPH",
  Php: "PHP", Col: "COL", "1Th": "1TH", "2Th": "2TH",
  "1Ti": "1TI", "2Ti": "2TI", Tit: "TIT", Phm: "PHM",
  Heb: "HEB", Jas: "JAS", "1Pe": "1PE", "2Pe": "2PE",
  "1Jn": "1JN", "2Jn": "2JN", "3Jn": "3JN", Jud: "JUD",
  Rev: "REV",
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function defaultBibleId(apiKey: string): Promise<string> {
  const fromEnv = Deno.env.get("DEFAULT_BIBLE_ID")?.trim();
  if (fromEnv) return fromEnv;
  const r = await fetch("https://rest.api.bible/v1/bibles?language=eng", {
    headers: { "api-key": apiKey },
  });
  if (!r.ok) throw new Error(`API.Bible bibles: ${r.status}`);
  const json = await r.json();
  const list = (json?.data ?? []) as { id: string; abbreviation?: string; name?: string }[];
  const pref = ["CSB", "KJV", "WEB", "ESV", "NIV"];
  for (const code of pref) {
    const found = list.find((b) => b.abbreviation?.toUpperCase() === code);
    if (found) return found.id;
  }
  const byName = list.find((b) =>
    /christian\s+standard\s+bible/i.test(b.name ?? "") || /\bcsb\b/i.test(b.name ?? ""),
  );
  return byName?.id ?? list[0]?.id ?? "";
}

function parseChapterText(content: string): { number: number; text: string }[] {
  const verses: { number: number; text: string }[] = [];
  const re = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const num = parseInt(m[1], 10);
    const text = m[2].replace(/\s+/g, " ").trim();
    if (text) verses.push({ number: num, text });
  }
  return verses;
}

async function fetchPassageText(
  apiKey: string,
  bibleId: string,
  bookAbbr: string,
  chapter: number,
  verseStart: number,
  verseEnd: number | null,
): Promise<string> {
  const usfm = BOOK_ID_MAP[bookAbbr];
  if (!usfm) throw new Error(`Unknown book: ${bookAbbr}`);
  const r = await fetch(
    `https://rest.api.bible/v1/bibles/${bibleId}/passages/${usfm}.${chapter}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`,
    { headers: { "api-key": apiKey } },
  );
  if (!r.ok) throw new Error(`API.Bible passage: ${r.status}`);
  const json = await r.json();
  const content: string = json?.data?.content ?? "";
  const verses = parseChapterText(content);
  const lo = Math.max(1, verseStart);
  const hi = verseEnd ?? lo;
  const slice = verses.filter((v) => v.number >= lo && v.number <= hi);
  if (slice.length === 0) {
    return verses.slice(0, 8).map((v) => `${v.number} ${v.text}`).join("\n");
  }
  return slice.map((v) => `${v.number} ${v.text}`).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const KEY = Deno.env.get("GEMINI_API_KEY")!;
    const API_BIBLE_KEY = Deno.env.get("API_BIBLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const date = todayUtc();
    const { data: existing } = await supabase
      .from("daily_readings")
      .select("id, reference, prompt, reason, passage")
      .eq("user_id", u.user.id)
      .eq("date", date)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, id: existing.id, existing: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: beliefs }, { data: tensions }] = await Promise.all([
      supabase.from("belief_nodes")
        .select("id,layer,topic,statement,confidence")
        .eq("user_id", u.user.id)
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase.from("belief_tensions")
        .select("summary,severity,status,a_id,b_id")
        .eq("user_id", u.user.id)
        .eq("status", "open")
        .limit(8),
    ]);

    const beliefSummary = (beliefs ?? []).map((b: { id: string; layer: string; topic: string; statement: string; confidence: number }) =>
      `id=${b.id} | ${b.layer} | ${b.topic}: ${b.statement} | confidence=${b.confidence}`,
    ).join("\n").slice(0, 5000);

    const tensionSummary = (tensions ?? []).map((t: { summary: string; severity: string }) =>
      `${t.severity}: ${t.summary}`,
    ).join("\n").slice(0, 1500);

    const prompt = `You are choosing ONE short Bible passage (1–5 verses) for this person's daily reading. Tie it to where their belief framework is active today — a belief they're strengthening, a gap, or an open tension. Be pastoral, non-denominational, and specific.

USER BELIEFS:
${beliefSummary || "(empty — pick a welcoming gospel or wisdom passage)"}

OPEN TENSIONS:
${tensionSummary || "(none)"}

Pick a real, citeable passage. Use standard English book names in reference (e.g. "Romans 8:28" or "John 3:16-17").`;

    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-pro",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "submit_daily",
            parameters: {
              type: "object",
              properties: {
                reference: { type: "string", description: 'e.g. "Romans 8:28-30"' },
                book_abbr: {
                  type: "string",
                  description: "3-letter app code: Gen, Exo, … Jhn, Rom, 1Co, etc.",
                },
                chapter: { type: "number" },
                verse_start: { type: "number" },
                verse_end: { type: "number", description: "Same as start if single verse" },
                reason: { type: "string", description: "2-3 sentences: why this passage today" },
                prompt: { type: "string", description: "1-2 reflective questions for journaling" },
                belief_id: { type: "string", description: "Related belief id or empty" },
              },
              required: ["reference", "book_abbr", "chapter", "verse_start", "reason", "prompt"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_daily" } },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "AI gateway", status: r.status, body: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await r.json();
    const args = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    let bookAbbr = String(args.book_abbr ?? "").trim();
    if (!VALID_ABBRS.has(bookAbbr)) bookAbbr = "Jhn";
    const chapter = Math.max(1, Math.min(150, Number(args.chapter) || 1));
    const verseStart = Math.max(1, Number(args.verse_start) || 1);
    const verseEndRaw = args.verse_end != null ? Number(args.verse_end) : null;
    const verseEnd = verseEndRaw && verseEndRaw >= verseStart ? verseEndRaw : null;

    const bibleId = await defaultBibleId(API_BIBLE_KEY);
    let passage = "";
    try {
      passage = await fetchPassageText(API_BIBLE_KEY, bibleId, bookAbbr, chapter, verseStart, verseEnd);
    } catch (e) {
      console.warn("framework-daily: passage fetch failed", e);
      passage = String(args.reference ?? "");
    }

    const validIds = new Set((beliefs ?? []).map((b: { id: string }) => b.id));
    const beliefId = validIds.has(args.belief_id) ? args.belief_id : null;

    const { data: ins, error: insErr } = await supabase.from("daily_readings").insert({
      user_id: u.user.id,
      date,
      reference: String(args.reference ?? `${bookAbbr} ${chapter}:${verseStart}`),
      passage,
      reason: String(args.reason ?? ""),
      prompt: String(args.prompt ?? ""),
      belief_id: beliefId,
    }).select("id, reference, prompt, reason").maybeSingle();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, id: ins?.id, existing: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("framework-daily error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
