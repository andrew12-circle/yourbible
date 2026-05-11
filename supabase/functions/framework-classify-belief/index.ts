// Quick belief capture — classify a free-form "I believe…" statement into the
// user's framework. Returns AI suggestion only; client decides whether to save.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-pro";

const SYSTEM = `You classify a single user-stated belief into a personal belief framework.
Be honest and minimal. Never invent doctrine. Always return JSON via the tool call.`;

const LAYERS = ["foundations", "life", "mechanics", "emotional"] as const;

const TOOL = {
  type: "function",
  function: {
    name: "classify_belief",
    description: "Classify the user's belief statement.",
    parameters: {
      type: "object",
      properties: {
        layer: { type: "string", enum: LAYERS },
        topic: { type: "string", description: "Short topic label, e.g. 'Prayer', 'Holy Spirit'." },
        statement: { type: "string", description: "Tight first-person belief sentence." },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
        tags: { type: "array", items: { type: "string" } },
        related: {
          type: "array",
          items: {
            type: "object",
            properties: {
              belief_id: { type: "string" },
              relation: { type: "string", enum: ["agree", "refines", "conflicts"] },
              severity: { type: "integer", minimum: 0, maximum: 100 },
              note: { type: "string" },
            },
            required: ["belief_id", "relation"],
          },
        },
        is_duplicate_of: { type: ["string", "null"] },
      },
      required: ["layer", "topic", "statement", "confidence"],
    },
  },
} as const;

function buildPrompt(rawText: string, source: string | undefined, beliefs: any[]) {
  const summary = beliefs.length
    ? beliefs
        .map((b) => `- id=${b.id} | layer=${b.layer} | topic=${b.topic} | "${b.statement}"`)
        .join("\n")
    : "(no existing beliefs yet)";
  return `EXISTING BELIEFS:
${summary}

USER'S NEW BELIEF (raw):
"""
${rawText.slice(0, 4000)}
"""
SOURCE (optional): ${source ?? "(none)"}

Task:
- Pick the best layer (foundations | life | mechanics | emotional).
- Pick a short topic label (reuse an existing topic when it fits).
- Rewrite the statement as a tight first-person sentence (start with "I believe" only if natural).
- Suggest a confidence 0-100 based on the user's wording (hedged → lower).
- 0-4 tags (lowercase, short).
- Related: only include existing belief ids that clearly relate. Use "agree", "refines", or "conflicts".
- is_duplicate_of: only if the new statement is essentially the same as an existing belief.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawText = (body?.raw_text ?? "").toString().trim();
    const source = body?.source ? String(body.source).slice(0, 200) : undefined;
    if (!rawText || rawText.length < 3) {
      return new Response(JSON.stringify({ error: "raw_text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: beliefs } = await supabase
      .from("belief_nodes")
      .select("id,layer,topic,statement")
      .eq("user_id", user.id)
      .limit(200);

    const r = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildPrompt(rawText, source, beliefs ?? []) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "classify_belief" } },
      }),
    });

    if (r.status === 429 || r.status === 402) {
      const msg = r.status === 429
        ? "Rate limited — try again in a moment."
        : "AI credits exhausted. Add credits in Settings → Workspace → Usage.";
      return new Response(JSON.stringify({ error: msg }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error:", r.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await r.json();
    const tc = json?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = null;
    if (tc?.function?.arguments) {
      try { parsed = JSON.parse(tc.function.arguments); } catch (e) { console.error(e); }
    }
    if (!parsed) {
      return new Response(JSON.stringify({ error: "could not classify" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate against existing belief ids.
    const validIds = new Set(((beliefs as any[]) ?? []).map((b) => b.id));
    const layer = LAYERS.includes(parsed.layer) ? parsed.layer : "life";
    const related = Array.isArray(parsed.related)
      ? parsed.related.filter((x: any) => x?.belief_id && validIds.has(x.belief_id))
      : [];
    const dup = parsed.is_duplicate_of && validIds.has(parsed.is_duplicate_of)
      ? parsed.is_duplicate_of
      : null;

    return new Response(JSON.stringify({
      classification: {
        layer,
        topic: String(parsed.topic ?? "General").slice(0, 80),
        statement: String(parsed.statement ?? rawText).slice(0, 600),
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence ?? 50))),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6).map(String) : [],
        related,
        is_duplicate_of: dup,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("framework-classify-belief error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});