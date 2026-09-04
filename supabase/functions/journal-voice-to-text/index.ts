/**
 * Transcribes journal voice/video audio with provider retry + fallback.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROFANITY_PATTERN =
  /\b(?:f+u+c+k(?:ing|in'|in|ed|er|ers|s)?|motherf+u+c+k(?:ing|er|ers|in'|in|ed|s)?|bull\s*sh[i1!]t(?:ting|ty|s)?|sh[i1!]t(?:ting|ty|s|head|heads)?|assholes?|b[i1!]tch(?:es|ing|y)?|cunts?|dickheads?|pricks?|twats?|wank(?:er|ers|ing)?|god\s*damn(?:ed|it)?|god\s*dammit)\b/gi;
const OBFUSCATED_PATTERN = /\bf[\W_]{0,3}u[\W_]{0,3}c[\W_]{0,3}k(?:[\W_]*ing|[\W_]*ed|[\W_]*er)?\b/gi;

function scrubTranscriptProfanity(text: string): string {
  if (!text) return text;
  return text
    .replace(PROFANITY_PATTERN, "")
    .replace(OBFUSCATED_PATTERN, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function elevenLabsTranscribe(file: Blob, filename: string, apiKey: string): Promise<string> {
  let last = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const fd = new FormData();
    fd.append("file", file, filename);
    fd.append("model_id", "scribe_v1");
    try {
      const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: fd,
        signal: AbortSignal.timeout(120_000),
      });
      if (res.ok) {
        const data = await res.json();
        return String(data.text ?? data.transcript ?? "").trim();
      }
      last = `${res.status}: ${(await res.text()).slice(0, 300)}`;
      if (res.status < 500 && res.status !== 429) break;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
    await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
  }
  throw new Error(`ElevenLabs transcription failed: ${last || "unknown error"}`);
}

async function openAiTranscribe(file: Blob, filename: string, apiKey: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file, filename);
  fd.append("model", "gpt-4o-mini-transcribe");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`OpenAI transcription failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return String(data.text ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ELEVEN = Deno.env.get("ELEVENLABS_API_KEY")?.trim() ?? "";
    const OPENAI = Deno.env.get("OPENAI_API_KEY")?.trim() ?? "";
    if (!ELEVEN && !OPENAI) {
      return new Response(JSON.stringify({ error: "No transcription provider configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storage_path, bucket: bucketRaw } = (await req.json()) as {
      storage_path?: string;
      bucket?: string;
    };
    const bucket = bucketRaw === "journal-videos" ? "journal-videos" : "voice-memos";
    if (!storage_path) {
      return new Response(JSON.stringify({ error: "storage_path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!storage_path.startsWith(`${u.user.id}/`)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: file, error: dlErr } = await admin.storage.from(bucket).download(storage_path);
    if (dlErr || !file) {
      return new Response(JSON.stringify({ error: `download failed: ${dlErr?.message ?? "missing"}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filename = storage_path.split("/").pop() ?? "memo.webm";
    let rawText = "";
    let provider = "";
    let firstError = "";

    if (ELEVEN) {
      try {
        rawText = await elevenLabsTranscribe(file, filename, ELEVEN);
        provider = "elevenlabs";
      } catch (e) {
        firstError = e instanceof Error ? e.message : String(e);
      }
    }

    if (!rawText && OPENAI) {
      try {
        rawText = await openAiTranscribe(file, filename, OPENAI);
        provider = "openai";
      } catch (e) {
        const secondError = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: "Transcription failed", detail: [firstError, secondError].filter(Boolean).join(" | ") }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const text = scrubTranscriptProfanity(rawText);
    if (!text) {
      return new Response(JSON.stringify({ error: "Empty transcript", detail: firstError || undefined }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, text, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
