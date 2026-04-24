// Edge function: fetch a chapter (or list of available bibles) from API.Bible.
// Public read endpoint — no auth required to read scripture.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const API_BASE = "https://api.scripture.api.bible/v1";

// Map our short canonical abbreviations to API.Bible's USFM-style book IDs.
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

interface PassageVerse { number: number; text: string; }

function stripTags(html: string): string {
  return html
    .replace(/<sup[^>]*class=["']?v["']?[^>]*>(\d+)<\/sup>/gi, "‖$1‖") // marker
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse plain text from API.Bible (when we requested content-type=text) into verses. */
function parseChapterText(content: string): PassageVerse[] {
  // API.Bible plain text uses [N] verse markers
  const verses: PassageVerse[] = [];
  const re = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const num = parseInt(m[1], 10);
    const text = m[2].replace(/\s+/g, " ").trim();
    if (text) verses.push({ number: num, text });
  }
  return verses;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const API_BIBLE_KEY = Deno.env.get("API_BIBLE_KEY");
    if (!API_BIBLE_KEY) {
      return new Response(JSON.stringify({ error: "API_BIBLE_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "passage";

    // List available English bibles for the API key
    if (action === "bibles") {
      const r = await fetch(`${API_BASE}/bibles?language=eng`, {
        headers: { "api-key": API_BIBLE_KEY },
      });
      const data = await r.json();
      return new Response(JSON.stringify(data), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action=passage : fetch one chapter
    const bibleId = url.searchParams.get("bibleId");
    const bookAbbr = url.searchParams.get("book"); // e.g. "Gen"
    const chapter = url.searchParams.get("chapter");

    if (!bibleId || !bookAbbr || !chapter) {
      return new Response(JSON.stringify({ error: "bibleId, book, chapter are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usfmBook = BOOK_ID_MAP[bookAbbr];
    if (!usfmBook) {
      return new Response(JSON.stringify({ error: `Unknown book: ${bookAbbr}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const passageId = `${usfmBook}.${chapter}`;
    const r = await fetch(
      `${API_BASE}/bibles/${bibleId}/passages/${passageId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`,
      { headers: { "api-key": API_BIBLE_KEY } }
    );

    if (!r.ok) {
      const errText = await r.text();
      return new Response(JSON.stringify({ error: `API.Bible: ${r.status}`, details: errText }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await r.json();
    const content: string = json?.data?.content ?? "";
    const verses = parseChapterText(stripTags(content));
    const reference: string = json?.data?.reference ?? `${bookAbbr} ${chapter}`;

    return new Response(JSON.stringify({ reference, verses }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bible-passage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
