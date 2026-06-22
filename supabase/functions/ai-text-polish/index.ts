// Light copyedit + dictation formatting for journaling. Uses shared AI provider (Gemini/OpenAI).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { callChatJson } from "../_shared/aiProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CHARS = 12_000;
const CHUNK_CHARS = 4_500;

function escapeForPrompt(s: string) {
  return s.replace(/"""/g, "'''");
}

function parsePolished(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as { polished?: string };
    if (typeof parsed.polished === "string" && parsed.polished.trim()) {
      return parsed.polished;
    }
  } catch {
    /* keep fallback */
  }
  return fallback;
}

function splitChunks(text: string): string[] {
  if (text.length <= CHUNK_CHARS) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_CHARS, text.length);
    if (end < text.length) {
      const space = text.lastIndexOf(" ", end);
      if (space > start + 500) end = space;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

async function formatDictation(text: string): Promise<{ polished: string; err?: string }> {
  const sys = `You transform raw speech-to-text journal dictation into readable prose. Reply with ONLY a JSON object: {"polished":"..."}.
Rules:
- Add proper sentence capitalization, punctuation, and paragraph breaks when the speaker shifts topic or pauses for a new thought.
- Fix obvious speech-recognition errors when context makes the intended word clear.
- Preserve every idea, prayer, name, and theological intent — do not add, remove, or soften content.
- Keep first-person voice; this is personal faith journaling.
- Use blank lines between paragraphs.
- Do not add titles, headers, bullet lists, or markdown unless the speaker explicitly dictated them.`;

  const chunks = splitChunks(text);
  const out: string[] = [];
  for (const chunk of chunks) {
    const user = `RAW DICTATION:\n"""${escapeForPrompt(chunk)}"""`;
    const result = await callChatJson(sys, user, 0.35, 16_384);
    if (!result.ok) {
      return { polished: text, err: result.err ?? "AI request failed" };
    }
    out.push(parsePolished(result.rawText, chunk));
  }
  return { polished: out.join("\n\n") };
}

async function polishText(text: string): Promise<{ polished: string; err?: string }> {
  const sys = `You lightly copyedit personal faith journaling or framework answers. Reply with ONLY a JSON object: {"polished":"..."}.
Rules:
- Fix spelling, grammar, punctuation, and obvious typos only.
- Preserve meaning, voice, first/second person, and theological intent; do not rephrase for style or "improve" theology.
- Do not add ideas, remove content, or change doctrine.
- If nothing needs fixing, return the input unchanged in "polished".`;

  const user = `TEXT:\n"""${escapeForPrompt(text)}"""`;
  const result = await callChatJson(sys, user, 0.25, 8_192);
  if (!result.ok) {
    return { polished: text, err: result.err ?? "AI request failed" };
  }
  return { polished: parsePolished(result.rawText, text) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { text?: string; mode?: string };
    const text = typeof body.text === "string" ? body.text : "";
    const mode = body.mode === "dictation" ? "dictation" : "polish";
    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > MAX_CHARS) {
      return new Response(JSON.stringify({ error: `text too long (max ${MAX_CHARS} chars)` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { polished, err } =
      mode === "dictation" ? await formatDictation(text) : await polishText(text);

    if (err) {
      console.error("ai-text-polish:", err);
      return new Response(JSON.stringify({ error: err.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safe = polished.length > MAX_CHARS * 2 ? polished.slice(0, MAX_CHARS * 2) : polished;
    return new Response(JSON.stringify({ polished: safe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-text-polish:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
