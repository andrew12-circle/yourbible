// Edge function: search scripture via API.Bible.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const API_BASE = "https://rest.api.bible/v1";

const BOOK_ID_TO_ABBR: Record<string, string> = {
  GEN: "Gen", EXO: "Exo", LEV: "Lev", NUM: "Num", DEU: "Deu",
  JOS: "Jos", JDG: "Jdg", RUT: "Rut",
  "1SA": "1Sa", "2SA": "2Sa", "1KI": "1Ki", "2KI": "2Ki",
  "1CH": "1Ch", "2CH": "2Ch",
  EZR: "Ezr", NEH: "Neh", EST: "Est",
  JOB: "Job", PSA: "Psa", PRO: "Pro", ECC: "ECC", SNG: "Sng",
  ISA: "Isa", JER: "Jer", LAM: "Lam", EZK: "Ezk", DAN: "Dan",
  HOS: "Hos", JOL: "Jol", AMO: "Amo", OBA: "Oba", JON: "Jon",
  MIC: "Mic", NAM: "Nam", HAB: "Hab", ZEP: "Zep", HAG: "Hag",
  ZEC: "Zec", MAL: "Mal",
  MAT: "Mat", MRK: "Mrk", LUK: "Luk", JHN: "Jhn",
  ACT: "Act",
  ROM: "Rom", "1CO": "1Co", "2CO": "2Co", GAL: "Gal", EPH: "Eph",
  PHP: "Php", COL: "Col", "1TH": "1Th", "2TH": "2Th",
  "1TI": "1Ti", "2TI": "2Ti", TIT: "Tit", PHM: "Phm",
  HEB: "Heb", JAS: "Jas", "1PE": "1Pe", "2PE": "2Pe",
  "1JN": "1Jn", "2JN": "2Jn", "3JN": "3Jn", JUD: "Jud",
  REV: "Rev",
};

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseReference(ref: string): { book: string; chapter: number; verse: number } | null {
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)/);
  if (!m) return null;
  return { book: m[1].trim(), chapter: parseInt(m[2], 10), verse: parseInt(m[3], 10) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const API_BIBLE_KEY = Deno.env.get("API_BIBLE_KEY");
    if (!API_BIBLE_KEY) {
      return new Response(JSON.stringify({ error: "API_BIBLE_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const bibleId = url.searchParams.get("bibleId");
    const query = url.searchParams.get("q")?.trim();
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));

    if (!bibleId || !query) {
      return new Response(JSON.stringify({ error: "bibleId and q are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchUrl = new URL(`${API_BASE}/bibles/${bibleId}/search`);
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("limit", String(limit));
    searchUrl.searchParams.set("sort", "relevance");

    const r = await fetch(searchUrl.toString(), {
      headers: { "api-key": API_BIBLE_KEY },
    });

    if (!r.ok) {
      const errText = await r.text();
      return new Response(JSON.stringify({ error: `API.Bible: ${r.status}`, details: errText }), {
        status: r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await r.json();
    const verses = (json?.data?.verses ?? []) as Array<{
      reference?: string;
      text?: string;
      bookId?: string;
      chapterId?: string;
      verseId?: string;
    }>;

    const results = verses.map((v) => {
      const ref = v.reference ?? "";
      const parsed = parseReference(ref);
      const bookFromId = v.bookId ? BOOK_ID_TO_ABBR[v.bookId] : undefined;
      const chapterFromId = v.chapterId?.split(".")?.[1];
      const verseFromId = v.verseId?.split(".")?.[2];
      return {
        reference: ref,
        book: bookFromId ?? parsed?.book ?? "",
        chapter: chapterFromId ? parseInt(chapterFromId, 10) : (parsed?.chapter ?? 1),
        verse: verseFromId ? parseInt(verseFromId, 10) : (parsed?.verse ?? 1),
        text: stripTags(v.text ?? ""),
      };
    });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bible-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
