// Light copyedit for journaling / framework answers. Uses Gemini (OpenAI-compatible) with GEMINI_API_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MAX_CHARS = 12_000;

function escapeForPrompt(s: string) {
  return s.replace(/"""/g, "'''");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const KEY = Deno.env.get("GEMINI_API_KEY");
    if (!KEY) {
      return new Response(
        JSON.stringify({ error: "AI polish is not configured (missing GEMINI_API_KEY on the server)." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
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

    const body = (await req.json()) as { text?: string };
    const text = typeof body.text === "string" ? body.text : "";
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

    const sys =
      `You lightly copyedit personal faith journaling or framework answers. Reply with ONLY a JSON object: {"polished":"..."}.
Rules:
- Fix spelling, grammar, punctuation, and obvious typos only.
- Preserve meaning, voice, first/second person, and theological intent; do not rephrase for style or "improve" theology.
- Do not add ideas, remove content, or change doctrine.
- If nothing needs fixing, return the input unchanged in "polished".`;

    const user = `TEXT:\n"""${escapeForPrompt(text)}"""`;

    const r = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "AI gateway error", body: t }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    let polished = text;
    try {
      const parsed = JSON.parse(raw) as { polished?: string };
      if (typeof parsed.polished === "string" && parsed.polished.length > 0) {
        polished = parsed.polished;
      }
    } catch {
      /* keep original */
    }
    if (polished.length > MAX_CHARS * 2) {
      polished = polished.slice(0, MAX_CHARS * 2);
    }
    return new Response(JSON.stringify({ polished }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
