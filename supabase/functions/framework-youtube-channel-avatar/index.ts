// Resolves a YouTube channel profile image for artifact metadata backfill.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { resolveYouTubeChannelThumbnail } from "../_shared/youtubeChannelAvatar.ts";

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { artifact_id?: string; url?: string; channel_url?: string };
    let videoUrl = body.url?.trim() || "";
    let channelUrl = body.channel_url?.trim() || "";

    if (body.artifact_id) {
      const { data: row, error } = await supabase
        .from("artifacts")
        .select("id,user_id,kind,url,metadata")
        .eq("id", body.artifact_id)
        .maybeSingle();
      if (error || !row || row.user_id !== u.user.id) {
        return new Response(JSON.stringify({ error: "Artifact not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (row.kind !== "youtube" || !row.url) {
        return new Response(JSON.stringify({ error: "Not a YouTube artifact" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      videoUrl = row.url;
      const meta = (row.metadata as Record<string, unknown> | null | undefined) ?? {};
      channelUrl = typeof meta.channel_url === "string" ? meta.channel_url : channelUrl;
    }

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "url or artifact_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractYouTubeVideoId(videoUrl);
    let watchHtml: string | null = null;
    if (videoId) {
      const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; YourBible/1.0)",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }).catch(() => null);
      if (watchRes?.ok) watchHtml = await watchRes.text();
    }

    const channel_thumbnail_url = await resolveYouTubeChannelThumbnail({
      videoId,
      channelUrl: channelUrl || null,
      watchHtml,
    });

    if (body.artifact_id && channel_thumbnail_url) {
      const { data: row } = await supabase
        .from("artifacts")
        .select("metadata")
        .eq("id", body.artifact_id)
        .eq("user_id", u.user.id)
        .maybeSingle();
      const prevMeta = (row?.metadata as Record<string, unknown> | null | undefined) ?? {};
      await supabase
        .from("artifacts")
        .update({ metadata: { ...prevMeta, channel_thumbnail_url } })
        .eq("id", body.artifact_id)
        .eq("user_id", u.user.id);
    }

    return new Response(JSON.stringify({ ok: true, channel_thumbnail_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
