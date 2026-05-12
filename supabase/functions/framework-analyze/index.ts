// Framework Analyze — extracts claims from an artifact and compares them
// against the user's existing belief framework using the Lovable AI Gateway.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-pro";

interface Belief {
  id: string;
  layer: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
}

interface ClaimOut {
  claim: string;
  tone?: string;
  doctrine_tags?: string[];
  scripture_supports?: { ref: string; note?: string }[];
  scripture_challenges?: { ref: string; note?: string }[];
  matched_belief_id?: string | null;
  match_relation?: "agree" | "disagree" | "new" | null;
  bias_flags?: string[];
}

const SYSTEM = `You are a careful theology research assistant.
Your job is NOT to declare what is true. Your job is to surface claims, compare them to the user's stated beliefs, and cite scriptures that support or challenge the claim.
Be honest about uncertainty. Never speak as God or a prophet. Never push a denomination.
Always return strict JSON matching the requested schema. No prose outside JSON.`;

function buildPrompt(text: string, beliefs: Belief[]) {
  const beliefSummary = beliefs.length
    ? beliefs
        .map(
          (b) =>
            `- id=${b.id} | layer=${b.layer} | topic=${b.topic} | statement="${b.statement}" | answer="${(b.answer ?? "").slice(0, 280)}" | confidence=${b.confidence}`,
        )
        .join("\n")
    : "(none yet — every claim should be marked match_relation:'new', matched_belief_id:null)";

  return `USER'S CURRENT BELIEFS:
${beliefSummary}

ARTIFACT TEXT (sermon / podcast / lyrics / journal):
"""
${text.slice(0, 16000)}
"""

Task:
1. Extract 3 to 8 of the most load-bearing CLAIMS from the artifact (1–2 sentences each).
2. For each claim, fill in:
   - tone: one of peace, fear, urgency, shame, hope, conviction, neutral, anger, comfort
   - doctrine_tags: 1–3 short tags (e.g. "soteriology", "suffering", "prosperity", "spiritual gifts")
   - scripture_supports: 0–3 verses that support the claim, with a one-line note
   - scripture_challenges: 0–3 verses that challenge or complicate the claim, with a one-line note
   - matched_belief_id: the user belief id this claim most closely relates to, or null
   - match_relation: "agree" if the user's belief agrees with the claim, "disagree" if it conflicts, "new" if there is no clear matching belief
   - bias_flags: 0–3 short flags such as "fear-based framing", "guilt appeal", "out-of-context proof-text", "emotional manipulation", "denominational assumption" — only when clearly present

Return ONLY valid JSON of shape:
{ "claims": ClaimOut[] }`;
}

const TOOL = {
  type: "function",
  function: {
    name: "submit_claims",
    description: "Submit the extracted claim analysis.",
    parameters: {
      type: "object",
      properties: {
        claims: {
          type: "array",
          items: {
            type: "object",
            properties: {
              claim: { type: "string" },
              tone: { type: "string" },
              doctrine_tags: { type: "array", items: { type: "string" } },
              scripture_supports: {
                type: "array",
                items: {
                  type: "object",
                  properties: { ref: { type: "string" }, note: { type: "string" } },
                  required: ["ref"],
                },
              },
              scripture_challenges: {
                type: "array",
                items: {
                  type: "object",
                  properties: { ref: { type: "string" }, note: { type: "string" } },
                  required: ["ref"],
                },
              },
              matched_belief_id: { type: ["string", "null"] },
              match_relation: { type: ["string", "null"], enum: ["agree", "disagree", "new", null] },
              bias_flags: { type: "array", items: { type: "string" } },
            },
            required: ["claim"],
          },
        },
      },
      required: ["claims"],
    },
  },
} as const;

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

    const { artifact_id, processing_token } = (await req.json()) as { artifact_id?: string; processing_token?: string };
    if (!artifact_id || !processing_token) {
      return new Response(JSON.stringify({ error: "artifact_id and processing_token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: artifact, error: aErr } = await supabase
      .from("artifacts")
      .select("id,user_id,raw_text,processing_token")
      .eq("id", artifact_id)
      .maybeSingle();
    if (aErr || !artifact) throw new Error("Artifact not found");
    if (artifact.processing_token !== processing_token) {
      return new Response(JSON.stringify({ ok: true, stale: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: beliefs } = await supabase
      .from("belief_nodes")
      .select("id,layer,topic,statement,answer,confidence")
      .eq("user_id", artifact.user_id);

    const prompt = buildPrompt(artifact.raw_text as string, (beliefs as Belief[]) ?? []);

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
          { role: "user", content: prompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "submit_claims" } },
      }),
    });

    if (r.status === 429 || r.status === 402) {
      const msg =
        r.status === 429
          ? "Rate limited — try again in a moment."
          : "AI credits exhausted. Add credits in Settings → Workspace → Usage.";
      await supabase.from("artifacts").update({ status: "error", error: msg }).eq("id", artifact_id);
      return new Response(JSON.stringify({ error: msg }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error:", r.status, t);
      await supabase.from("artifacts").update({ status: "error", error: "AI gateway error" }).eq("id", artifact_id);
      throw new Error("AI gateway error");
    }

    const json = await r.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { claims: ClaimOut[] } = { claims: [] };
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); }
      catch (e) { console.error("parse fail", e); }
    } else {
      // Fallback: try to parse the message content directly.
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content === "string") {
        try { parsed = JSON.parse(content); } catch { /* ignore */ }
      }
    }

    const validBeliefIds = new Set(((beliefs as Belief[]) ?? []).map((b) => b.id));
    const rows = (parsed.claims ?? []).slice(0, 12).map((c) => ({
      user_id: artifact.user_id,
      artifact_id,
      claim: c.claim,
      tone: c.tone ?? null,
      doctrine_tags: c.doctrine_tags ?? [],
      scripture_supports: c.scripture_supports ?? [],
      scripture_challenges: c.scripture_challenges ?? [],
      matched_belief_id:
        c.matched_belief_id && validBeliefIds.has(c.matched_belief_id)
          ? c.matched_belief_id
          : null,
      match_relation:
        c.match_relation ??
        (c.matched_belief_id && validBeliefIds.has(c.matched_belief_id) ? "agree" : "new"),
      bias_flags: c.bias_flags ?? [],
    }));

    const { data: gate } = await supabase
      .from("artifacts")
      .select("id")
      .eq("id", artifact_id)
      .eq("processing_token", processing_token)
      .maybeSingle();
    if (!gate) {
      return new Response(JSON.stringify({ ok: true, stale: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("artifact_claims").delete().eq("artifact_id", artifact_id);

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("artifact_claims").insert(rows);
      if (insErr) console.error("insert claims err", insErr);
    }

    await supabase
      .from("artifacts")
      .update({ status: "ready", error: rows.length === 0 ? "No claims could be extracted." : null })
      .eq("id", artifact_id)
      .eq("processing_token", processing_token);

    return new Response(JSON.stringify({ ok: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("framework-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
