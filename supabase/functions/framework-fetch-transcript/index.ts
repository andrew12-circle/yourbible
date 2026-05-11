// Fetches a YouTube transcript using Lovable AI (Gemini), then triggers framework-analyze.
// Gemini natively understands YouTube URLs, which is far more reliable than scraping
// captions (YouTube now blocks server-side caption fetching with PoToken requirements).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "youtu.be" || u.hostname.endsWith("youtube.com");
  } catch {
    return false;
  }
}

async function transcribeWithGemini(
  url: string,
  apiKey: string,
): Promise<{ text: string; title?: string }> {
  const prompt = `You are given a YouTube video. Transcribe the spoken English content verbatim.
Rules:
- Return ONLY a JSON object with this exact shape: {"title": string, "transcript": string}
- "title" is the video's title (or your best inference if none).
- "transcript" is the complete spoken transcript, no timestamps, no speaker labels unless clearly distinct.
- Preserve sentence punctuation. Do not summarize.
Video URL: ${url}`;

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 402) {
      throw new Error("Lovable AI credits are exhausted for this workspace. Add credits in Settings → Workspace → Usage, then try again — or paste the transcript manually below.");
    }
    if (res.status === 429) {
      throw new Error("AI is rate-limited right now. Wait a moment and try again, or paste the transcript manually below.");
    }
    throw new Error(`AI gateway ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Empty response from transcription model.");

  // Try strict JSON, then fall back to extracting the first JSON object.
  let parsed: { title?: string; transcript?: string } | null = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
    }
  }
  const transcript = (parsed?.transcript ?? "").trim();
  const title = parsed?.title?.trim() || undefined;
  if (!transcript) {
    // If the model just gave plain text, treat it as transcript.
    const fallback = content.trim();
    if (fallback.length > 40) return { text: fallback, title };
    throw new Error("Model returned no transcript. The video may be private, age-restricted, or have no spoken English.");
  }
  return { text: transcript, title };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
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

    if (!isYouTubeUrl(url)) {
      await supabase.from("artifacts").update({ status: "error", error: "Not a valid YouTube URL." }).eq("id", artifact_id);
      return new Response(JSON.stringify({ error: "Bad YouTube URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!GEMINI_API_KEY) {
      const msg = "Gemini API key not configured. Paste the transcript manually.";
      await supabase.from("artifacts").update({ status: "error", error: msg }).eq("id", artifact_id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: { text: string; title?: string };
    try {
      result = await transcribeWithGemini(url, GEMINI_API_KEY);
    } catch (e) {
      const msg = `Could not transcribe video: ${String((e as Error).message ?? e)}. Paste the transcript manually.`;
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
