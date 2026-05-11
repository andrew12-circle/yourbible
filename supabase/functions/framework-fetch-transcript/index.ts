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
  // Use YouTube's InnerTube player API. More reliable than scraping the watch page,
  // which often returns a consent wall to server-side / cloud IPs.
  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  async function callPlayer(client: "ANDROID" | "WEB" | "IOS") {
    const ctx: Record<string, any> = {
      ANDROID: {
        clientName: "ANDROID",
        clientVersion: "19.09.37",
        androidSdkVersion: 30,
        hl: "en",
        gl: "US",
      },
      WEB: { clientName: "WEB", clientVersion: "2.20240726.00.00", hl: "en", gl: "US" },
      IOS: { clientName: "IOS", clientVersion: "19.09.3", hl: "en", gl: "US" },
    }[client];
    const r = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": UA,
          "X-YouTube-Client-Name":
            client === "ANDROID" ? "3" : client === "IOS" ? "5" : "1",
          "X-YouTube-Client-Version": ctx.clientVersion,
          "Accept-Language": "en-US,en;q=0.9",
          Origin: "https://www.youtube.com",
        },
        body: JSON.stringify({
          videoId,
          context: { client: ctx },
          contentCheckOk: true,
          racyCheckOk: true,
        }),
      },
    );
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  }

  let data: any = null;
  for (const c of ["ANDROID", "WEB", "IOS"] as const) {
    data = await callPlayer(c);
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (Array.isArray(tracks) && tracks.length) break;
  }

  const title: string | undefined = data?.videoDetails?.title;
  const tracks: any[] =
    data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  if (!tracks.length) return title ? { text: "", title } : null;

  const pick =
    tracks.find((t) => t.languageCode === "en" && t.kind !== "asr") ??
    tracks.find((t) => (t.languageCode ?? "").startsWith("en") && t.kind !== "asr") ??
    tracks.find((t) => t.languageCode === "en") ??
    tracks.find((t) => (t.languageCode ?? "").startsWith("en")) ??
    tracks[0];
  if (!pick?.baseUrl) return title ? { text: "", title } : null;

  // Prefer JSON3 format for cleaner parsing
  const url = pick.baseUrl + (pick.baseUrl.includes("fmt=") ? "" : "&fmt=json3");
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("json")) {
    const j = await res.json().catch(() => null);
    const events = j?.events ?? [];
    const text = events
      .flatMap((e: any) => (e?.segs ?? []).map((s: any) => s.utf8 ?? ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (text) return { text, title };
  }
  const xml = await fetch(pick.baseUrl, { headers: { "User-Agent": UA } })
    .then((r) => r.text())
    .catch(() => "");
  if (!xml) return title ? { text: "", title } : null;
  const text = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map((m) =>
      m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#10;|\n/g, " ")
        .replace(/<[^>]+>/g, "")
        .trim(),
    )
    .filter(Boolean)
    .join(" ");
  if (!text) return title ? { text: "", title } : null;
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