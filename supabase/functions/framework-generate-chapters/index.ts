// Generate navigable chapters from artifact transcript when YouTube description has none.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { generateChaptersFromTranscript } from "../_shared/generateTranscriptChapters.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseDurationSeconds(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const d = (metadata as Record<string, unknown>).duration_seconds;
  if (typeof d === "number" && Number.isFinite(d) && d > 0) return Math.floor(d);
  const n = Number(d);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function shouldSkipChapterGeneration(metadata: unknown, force: boolean): boolean {
  if (force) return false;
  if (!metadata || typeof metadata !== "object") return false;
  const meta = metadata as Record<string, unknown>;
  const raw = meta.youtube_chapters;
  if (!Array.isArray(raw) || raw.length === 0) return false;
  const source = meta.youtube_chapters_source;
  if (source === "youtube_data_api_v3" || source === "watch_player_response") return true;
  if (source === "transcript_ai" || source === "transcript_heuristic") return true;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
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

    const body = (await req.json()) as { artifact_id?: string; force?: boolean };
    const artifact_id = body.artifact_id;
    if (!artifact_id) {
      return new Response(JSON.stringify({ error: "artifact_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row, error } = await supabase
      .from("artifacts")
      .select("id,user_id,kind,title,raw_text,metadata")
      .eq("id", artifact_id)
      .maybeSingle();
    if (error || !row || row.user_id !== u.user.id) {
      return new Response(JSON.stringify({ error: "Artifact not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.kind !== "youtube") {
      return new Response(JSON.stringify({ error: "Only YouTube artifacts support chapters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawText = typeof row.raw_text === "string" ? row.raw_text : "";
    if (rawText.trim().length < 200) {
      return new Response(JSON.stringify({ error: "Transcript too short to outline chapters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (shouldSkipChapterGeneration(row.metadata, Boolean(body.force))) {
      const prevMeta = (row.metadata as Record<string, unknown> | null | undefined) ?? {};
      const count = Array.isArray(prevMeta.youtube_chapters) ? prevMeta.youtube_chapters.length : 0;
      return new Response(JSON.stringify({ ok: true, skipped: true, count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prevMeta = (row.metadata as Record<string, unknown> | null | undefined) ?? {};

    const durationSeconds = parseDurationSeconds(row.metadata);
    const generated = await generateChaptersFromTranscript({
      apiKey: GEMINI_API_KEY,
      rawText,
      durationSeconds,
      title: row.title,
    });

    if (!generated.chapters.length) {
      return new Response(JSON.stringify({ error: "Could not generate chapters from this transcript" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = {
      ...prevMeta,
      youtube_chapters: generated.chapters,
      youtube_chapters_source: generated.source,
    };

    const { error: upErr } = await supabase
      .from("artifacts")
      .update({ metadata })
      .eq("id", artifact_id)
      .eq("user_id", u.user.id);
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, count: generated.chapters.length, source: generated.source }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
