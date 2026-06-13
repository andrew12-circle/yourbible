/**
 * Resolve YouTube captions for the add-video UI and client submit path.
 * Browser fetch to YouTube is blocked by CORS; this runs worker + server caption tiers.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  getCachedYouTubeTranscript,
  saveCachedYouTubeTranscript,
} from "../_shared/youtubeTranscriptCache.ts";
import { fetchWorkerSequential } from "../_shared/transcriptProviders/youtubeTranscriptWorker.ts";
import {
  buildCaptionLanes,
  CAPTION_RACE_TIMEOUT_MS,
  fetchTranscriptPlusSequential,
  outcomeFromTimedText,
  raceCaptionLanes,
} from "../_shared/youtubeTranscriptRace.ts";
import { fetchInvidiousSequential } from "../_shared/youtubeInvidiousTranscript.ts";
import { fetchTimedTextTranscript } from "../_shared/youtubeTranscript.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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

    const body = (await req.json()) as { video_id?: string };
    const videoId = body.video_id?.trim();
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return new Response(JSON.stringify({ error: "video_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = SERVICE_ROLE ? createClient(SUPABASE_URL, SERVICE_ROLE) : null;

    const cached = await getCachedYouTubeTranscript(admin, videoId);
    if (cached?.rawText?.trim()) {
      return new Response(JSON.stringify({
        text: cached.rawText,
        source: "cache",
        provider: cached.provider,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const worker = await fetchWorkerSequential(videoId);
    if (worker.result?.rawText?.trim()) {
      await saveCachedYouTubeTranscript(admin, videoId, {
        rawText: worker.result.rawText,
        provider: worker.result.provider,
        source: "third_party",
      });
      return new Response(JSON.stringify({
        text: worker.result.rawText,
        source: "worker",
        provider: worker.result.provider,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lanes = buildCaptionLanes({
      videoId,
      userId: u.user.id,
      admin,
      fetchWatchCaptions: async () => fetchTimedTextTranscript(videoId),
    });
    const { winner } = await raceCaptionLanes(lanes, CAPTION_RACE_TIMEOUT_MS);
    if (winner?.rawText?.trim()) {
      await saveCachedYouTubeTranscript(admin, videoId, {
        rawText: winner.rawText,
        provider: winner.provider,
        source: "caption",
      });
      return new Response(JSON.stringify({
        text: winner.rawText,
        source: "caption_race",
        provider: winner.provider,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plusSeq = await fetchTranscriptPlusSequential(videoId);
    if (plusSeq.text?.trim()) {
      await saveCachedYouTubeTranscript(admin, videoId, {
        rawText: plusSeq.text,
        provider: "youtube_transcript_plus",
        source: "caption",
      });
      return new Response(JSON.stringify({
        text: plusSeq.text,
        source: "transcript_plus",
        provider: "youtube_transcript_plus",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invSeq = await fetchInvidiousSequential(videoId);
    if (invSeq.text?.trim()) {
      await saveCachedYouTubeTranscript(admin, videoId, {
        rawText: invSeq.text,
        provider: "youtube_invidious",
        source: "caption",
      });
      return new Response(JSON.stringify({
        text: invSeq.text,
        source: "invidious",
        provider: "youtube_invidious",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timed = await fetchTimedTextTranscript(videoId).catch(() => null);
    if (timed?.trim()) {
      const fetch = outcomeFromTimedText(timed, "caption", "youtube_timedtext");
      await saveCachedYouTubeTranscript(admin, videoId, {
        rawText: fetch.rawText,
        provider: "youtube_timedtext",
        source: "caption",
      });
      return new Response(JSON.stringify({
        text: fetch.rawText,
        source: "timedtext",
        provider: "youtube_timedtext",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      error: "No captions found",
      worker_note: worker.note,
      transcript_plus_note: plusSeq.note,
      invidious_note: invSeq.note,
    }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
