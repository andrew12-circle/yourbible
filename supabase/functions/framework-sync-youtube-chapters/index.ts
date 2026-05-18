// One-shot: parse YouTube chapters from description and merge into artifact.metadata (backfill + repair).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { parseYoutubeChaptersFromDescription } from "../_shared/youtubeChapters.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.split("/").filter(Boolean)[0] ?? null;
    if (u.hostname.endsWith("youtube.com")) {
      return u.searchParams.get("v") || u.pathname.match(/\/shorts\/([^/?#]+)/)?.[1] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function parseJsonObjectFromHtml(html: string, marker: string): unknown | null {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;
  const start = html.indexOf("{", markerIndex);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

async function fetchDescriptionViaDataApi(videoId: string): Promise<string | null> {
  const key = Deno.env.get("YOUTUBE_DATA_API_KEY");
  if (!key) return null;
  const u = new URL("https://www.googleapis.com/youtube/v3/videos");
  u.searchParams.set("part", "snippet");
  u.searchParams.set("id", videoId);
  u.searchParams.set("key", key);
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const json = await res.json() as { items?: Array<{ snippet?: { description?: string } }> };
  const desc = json?.items?.[0]?.snippet?.description;
  return typeof desc === "string" && desc.trim() ? desc : null;
}

async function fetchDescriptionFromWatchPage(videoId: string): Promise<string | null> {
  const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ChapterSync/1.0)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!watchRes.ok) return null;
  const html = await watchRes.text();
  const playerResponse = parseJsonObjectFromHtml(html, "ytInitialPlayerResponse") as {
    videoDetails?: { shortDescription?: string };
  } | null;
  const sd = playerResponse?.videoDetails?.shortDescription;
  return typeof sd === "string" && sd.trim() ? sd : null;
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

    const { artifact_id } = (await req.json()) as { artifact_id?: string };
    if (!artifact_id) {
      return new Response(JSON.stringify({ error: "artifact_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row, error } = await supabase
      .from("artifacts")
      .select("id,user_id,kind,url,metadata")
      .eq("id", artifact_id)
      .maybeSingle();
    if (error || !row || row.user_id !== u.user.id) {
      return new Response(JSON.stringify({ error: "Artifact not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.kind !== "youtube" || !row.url) {
      return new Response(JSON.stringify({ error: "Not a YouTube artifact" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractYouTubeVideoId(row.url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Bad YouTube URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let desc = (await fetchDescriptionViaDataApi(videoId).catch(() => null)) ?? "";
    let chaptersSource: string = desc.trim() ? "youtube_data_api_v3" : "none";
    if (!desc.trim()) {
      desc = (await fetchDescriptionFromWatchPage(videoId).catch(() => null)) ?? "";
      chaptersSource = desc.trim() ? "watch_player_response" : "none";
    }

    const youtube_chapters = parseYoutubeChaptersFromDescription(desc);
    if (!youtube_chapters.length) chaptersSource = "none";

    const prevMeta = (row.metadata as Record<string, unknown> | null | undefined) ?? {};
    const metadata = {
      ...prevMeta,
      youtube_chapters,
      youtube_chapters_source: chaptersSource,
      video_id: videoId,
    };

    const { error: upErr } = await supabase.from("artifacts").update({ metadata }).eq("id", artifact_id).eq("user_id", u.user.id);
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, count: youtube_chapters.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
