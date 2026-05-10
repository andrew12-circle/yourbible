// Fetches a YouTube transcript (no API key required) and stores it on an artifact,
// then triggers framework-analyze.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchYouTubeTranscript(videoId: string): Promise<{ text: string; title?: string } | null> {
  // 1) load watch page to discover caption tracks
  const html = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9" },
  }).then((r) => r.text()).catch(() => "");
  if (!html) return null;

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : undefined;

  const m = html.match(/"captionTracks":(\[.*?\])/);
  if (!m) return null;
  let tracks: any[] = [];
  try {
    tracks = JSON.parse(m[1].replace(/\\u0026/g, "&"));
  } catch {
    return null;
  }
  if (!tracks.length) return null;

  const pick =
    tracks.find((t) => t.languageCode === "en") ??
    tracks.find((t) => (t.languageCode ?? "").startsWith("en")) ??
    tracks[0];
  if (!pick?.baseUrl) return null;

  const xml = await fetch(pick.baseUrl).then((r) => r.text()).catch(() => "");
  if (!xml) return null;

  const lines = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) =>
    m[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#10;|\n/g, " ")
      .replace(/<[^>]+>/g, "")
      .trim(),
  );
  const text = lines.filter(Boolean).join(" ");
  if (!text) return null;
  return { text, title };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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

    const { artifact_id, url } = (await req.json()) as { artifact_id?: string; url?: string };
    if (!artifact_id || !url) {
      return new Response(JSON.stringify({ error: "artifact_id and url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      await supabase.from("artifacts").update({ status: "error", error: "Could not parse YouTube URL." }).eq("id", artifact_id);
      return new Response(JSON.stringify({ error: "Bad YouTube URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await fetchYouTubeTranscript(videoId);
    if (!result) {
      const msg = "No captions available for this video. Paste the transcript manually.";
      await supabase.from("artifacts").update({ status: "error", error: msg }).eq("id", artifact_id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("artifacts")
      .update({
        raw_text: result.text,
        title: result.title ?? null,
        status: "analyzing",
        error: null,
      })
      .eq("id", artifact_id);

    // Kick off analyze
    fetch(`${SUPABASE_URL}/functions/v1/framework-analyze`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ artifact_id }),
    }).catch((e) => console.error("analyze kick err", e));

    return new Response(JSON.stringify({ ok: true, length: result.text.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});