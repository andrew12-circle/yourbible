/**
 * Generates or refreshes a playbook item from an accepted teaching (Gemini tool JSON),
 * anchored in the user's identity summary and beliefs. JWT required.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-pro";

const CADENCES = new Set(["daily", "weekly", "monthly", "once"]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeTextForMatch(s: string) {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function scriptureRefLikelyInText(rawText: string, ref: string): boolean {
  const t = normalizeTextForMatch(rawText).toLowerCase();
  const r = normalizeTextForMatch(ref).trim().toLowerCase();
  if (!r || r.length < 3) return false;
  if (t.includes(r)) return true;
  const compact = r.replace(/\s+/g, "");
  return compact.length >= 4 && t.replace(/\s+/g, "").includes(compact);
}

function filterAllowedScriptures(rawText: string, teachingRefs: string[], candidate: unknown): string[] {
  const allowed = new Set(teachingRefs.map((x) => x.trim().toLowerCase()).filter(Boolean));
  if (!Array.isArray(candidate)) return [];
  const out: string[] = [];
  for (const x of candidate) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!s) continue;
    const low = s.toLowerCase();
    if (!allowed.has(low) && !scriptureRefLikelyInText(rawText, s)) continue;
    if (out.length < 16 && !out.some((y) => y.toLowerCase() === low)) out.push(s.slice(0, 120));
  }
  return out;
}

async function callGemini(
  apiKey: string,
  messages: { role: string; content: string }[],
  tools: unknown[],
  toolChoice: unknown,
) {
  return await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      tool_choice: toolChoice,
    }),
  });
}

function parseToolCall(json: unknown, toolName: string): string | null {
  const j = json as {
    choices?: { message?: { tool_calls?: { function?: { name?: string; arguments?: string } }[] } }[];
  };
  const toolCalls = j?.choices?.[0]?.message?.tool_calls;
  const match = toolCalls?.find((t) => t?.function?.name === toolName);
  if (match?.function?.arguments) return match.function.arguments;
  return null;
}

const PLAYBOOK_TOOL = {
  type: "function",
  function: {
    name: "submit_playbook",
    description: "Submit the personalized playbook plan for this teaching.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        why: { type: "string" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              cadence: { type: "string", enum: ["daily", "weekly", "monthly", "once"] },
            },
            required: ["text", "cadence"],
          },
        },
        watch_outs: { type: "array", items: { type: "string" } },
        scriptures: { type: "array", items: { type: "string" } },
        related_belief_ids: { type: "array", items: { type: "string" } },
      },
      required: ["title", "why", "steps", "watch_outs", "scriptures", "related_belief_ids"],
    },
  },
} as const;

interface PlaybookStepRow {
  text: string;
  cadence: "daily" | "weekly" | "monthly" | "once";
  done?: boolean;
}

function normalizeSteps(raw: unknown): PlaybookStepRow[] {
  if (!Array.isArray(raw)) return [];
  const out: PlaybookStepRow[] = [];
  for (const x of raw) {
    if (!isRecord(x)) continue;
    const text = typeof x.text === "string" ? x.text.trim() : "";
    if (!text) continue;
    const c = typeof x.cadence === "string" ? x.cadence.trim().toLowerCase() : "once";
    const cadence = CADENCES.has(c) ? (c as PlaybookStepRow["cadence"]) : "once";
    out.push({ text: text.slice(0, 2000), cadence, done: false });
    if (out.length >= 20) break;
  }
  return out;
}

function normalizeStringArray(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!s) continue;
    out.push(s.slice(0, 500));
    if (out.length >= max) break;
  }
  return out;
}

function normalizeBeliefIds(raw: unknown, valid: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const id = x.trim();
    if (!valid.has(id)) continue;
    if (!out.includes(id)) out.push(id);
    if (out.length >= 12) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!GEMINI_API_KEY) return jsonResponse({ error: "GEMINI_API_KEY missing" }, 502);

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const uid = userData.user.id;

    const body = (await req.json()) as { teaching_id?: string };
    const teachingId = typeof body.teaching_id === "string" ? body.teaching_id.trim() : "";
    if (!teachingId) return jsonResponse({ error: "teaching_id required" }, 400);

    const { data: teaching, error: tErr } = await supabase
      .from("teachings")
      .select("id,user_id,artifact_id,title,summary,category,scriptures,source_snippet,status")
      .eq("id", teachingId)
      .eq("user_id", uid)
      .maybeSingle();
    if (tErr || !teaching) return jsonResponse({ error: tErr?.message ?? "Teaching not found" }, 502);
    if (teaching.status !== "accepted") {
      return jsonResponse({ error: "Teaching must be accepted before generating a playbook item." }, 400);
    }

    let rawText = "";
    if (teaching.artifact_id) {
      const { data: art } = await supabase
        .from("artifacts")
        .select("raw_text")
        .eq("id", teaching.artifact_id)
        .eq("user_id", uid)
        .maybeSingle();
      rawText = typeof art?.raw_text === "string" ? art.raw_text : "";
    }

    const teachingScriptures = Array.isArray(teaching.scriptures)
      ? (teaching.scriptures as string[]).filter((s): s is string => typeof s === "string")
      : [];

    const { data: profile } = await supabase
      .from("profiles")
      .select("identity_summary")
      .eq("user_id", uid)
      .maybeSingle();

    const { data: beliefRows, error: bErr } = await supabase
      .from("belief_nodes")
      .select("id,layer,topic,statement,answer,confidence")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false })
      .limit(25);
    if (bErr) return jsonResponse({ error: bErr.message }, 502);

    const beliefs = (beliefRows ?? []) as Array<{
      id: string;
      layer: string;
      topic: string;
      statement: string;
      answer: string | null;
      confidence: number;
    }>;
    const beliefIdSet = new Set(beliefs.map((b) => b.id));

    const beliefLines = beliefs
      .map(
        (b) =>
          `- id=${b.id} | layer=${b.layer} | topic=${b.topic} | statement="${b.statement}" | answer="${(b.answer ?? "").slice(0, 240)}" | confidence=${b.confidence}`,
      )
      .join("\n");

    const identityJson =
      profile?.identity_summary != null ? JSON.stringify(profile.identity_summary).slice(0, 6000) : "(none)";

    const userPrompt = `IDENTITY SUMMARY (JSON; may be empty):
${identityJson}

USER'S TOP BELIEFS (use ids in related_belief_ids when relevant):
${beliefLines || "(none)"}

TEACHING (accepted by the user — generate a concrete life plan):
- id: ${teaching.id}
- title: ${teaching.title}
- category: ${teaching.category}
- summary: ${(teaching.summary ?? "").slice(0, 1200)}
- scriptures from source (only reuse these in your scriptures array when they also appear verbatim or by reference in the artifact text rules below): ${JSON.stringify(teachingScriptures)}
- source_snippet (verbatim from artifact): ${JSON.stringify((teaching.source_snippet ?? "").slice(0, 220))}

ARTIFACT TEXT (for grounding scripture mentions only; excerpt):
"""
${rawText.slice(0, 14000)}
"""

Rules:
- why must explicitly tie to at least one belief id you were given (paraphrase that belief), or say how it extends their framework — never invent beliefs.
- steps: 3–8 actionable steps with cadence daily|weekly|monthly|once.
- watch_outs: 2–6 short risks or misapplications.
- scriptures: ONLY include items from the teaching's scriptures list that are also clearly grounded in the artifact excerpt above, OR short refs that appear verbatim in the excerpt. If unsure, use [].
- related_belief_ids: subset of the belief ids listed above (0–8 entries).

Return via tool submit_playbook only.`;

    const gr = await callGemini(
      GEMINI_API_KEY,
      [
        {
          role: "system",
          content:
            "You help a Christian user live out a specific teaching they accepted. Ground everything in the beliefs and identity data provided. Never invent scripture citations. Return strict JSON via the tool only.",
        },
        { role: "user", content: userPrompt },
      ],
      [PLAYBOOK_TOOL],
      { type: "function", function: { name: "submit_playbook" } },
    );

    if (!gr.ok) {
      const t = await gr.text();
      return jsonResponse({ error: `AI gateway error: ${t.slice(0, 400)}` }, 502);
    }

    const gj = await gr.json();
    const argsStr = parseToolCall(gj, "submit_playbook");
    if (!argsStr) return jsonResponse({ error: "Model did not return playbook tool output." }, 502);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(argsStr) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Invalid tool JSON from model." }, 502);
    }

    const title = typeof parsed.title === "string" ? parsed.title.trim().slice(0, 500) : "";
    const why = typeof parsed.why === "string" ? parsed.why.trim().slice(0, 4000) : "";
    if (!title || !why) return jsonResponse({ error: "Model returned an incomplete playbook." }, 502);

    const steps = normalizeSteps(parsed.steps);
    if (steps.length === 0) return jsonResponse({ error: "Model returned no valid steps." }, 502);

    const watch_outs = normalizeStringArray(parsed.watch_outs, 12);
    const scriptures = filterAllowedScriptures(rawText, teachingScriptures, parsed.scriptures);
    const related_belief_ids = normalizeBeliefIds(parsed.related_belief_ids, beliefIdSet);

    const { data: existing } = await supabase
      .from("playbook_items")
      .select("id,status,steps")
      .eq("teaching_id", teachingId)
      .maybeSingle();

    const prevSteps = Array.isArray(existing?.steps) ? (existing?.steps as unknown[]) : [];
    const mergedSteps = steps.map((s, i) => {
      const prev = prevSteps[i];
      if (isRecord(prev) && typeof prev.text === "string" && prev.text.trim() === s.text) {
        return {
          ...s,
          done: typeof prev.done === "boolean" ? prev.done : s.done,
        };
      }
      return s;
    });

    const prevStatus = typeof existing?.status === "string" ? existing.status : null;
    const keepStatus =
      prevStatus === "paused" || prevStatus === "complete" || prevStatus === "archived"
        ? prevStatus
        : "active";

    const row = {
      user_id: uid,
      teaching_id: teachingId,
      title,
      why,
      steps: mergedSteps,
      watch_outs,
      scriptures,
      related_belief_ids,
      status: keepStatus,
    };

    const { data: upserted, error: upErr } = await supabase
      .from("playbook_items")
      .upsert(row, { onConflict: "teaching_id" })
      .select("*")
      .maybeSingle();

    if (upErr || !upserted) {
      return jsonResponse({ error: upErr?.message ?? "Failed to save playbook item." }, 502);
    }

    return jsonResponse({ playbook_item: upserted });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
