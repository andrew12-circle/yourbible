import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { data: beliefs, error: bErr } = await supabase
      .from("belief_nodes")
      .select("id,layer,topic,statement,answer,confidence")
      .eq("user_id", user.id);
    if (bErr) throw bErr;
    if (!beliefs || beliefs.length < 2) {
      return new Response(
        JSON.stringify({ tensions: [], message: "Need at least 2 beliefs" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const beliefList = beliefs
      .map(
        (b: any, i: number) =>
          `[${i}] id=${b.id} layer=${b.layer} topic="${b.topic}" statement="${b.statement}" answer="${(b.answer ?? "").slice(0, 400)}" confidence=${b.confidence}`,
      )
      .join("\n");

    const prompt = `You are a careful theological + philosophical analyst. Below is a user's set of stated beliefs. Identify genuine TENSIONS or CONTRADICTIONS between PAIRS of these beliefs (same or related layer preferred). Do not invent tensions; only flag real logical or doctrinal conflict. For each tension return:
- a_id, b_id (must be exact ids from list)
- severity (0-100): how serious the conflict is
- summary: one sentence
- explanation: 2-4 sentences naming the conflict precisely
- suggested_resolution: a 1-2 sentence path forward (a question, a scripture to consult, or a clarification)

Return at most 8 tensions, sorted by severity desc. If none exist, return an empty array.

BELIEFS:
${beliefList}`;

    const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-pro",
        messages: [{ role: "user", content: prompt }],
        tools: [
          {
            type: "function",
            function: {
              name: "report_tensions",
              description: "Report detected tensions between belief pairs",
              parameters: {
                type: "object",
                properties: {
                  tensions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        a_id: { type: "string" },
                        b_id: { type: "string" },
                        severity: { type: "number" },
                        summary: { type: "string" },
                        explanation: { type: "string" },
                        suggested_resolution: { type: "string" },
                      },
                      required: ["a_id", "b_id", "severity", "summary"],
                    },
                  },
                },
                required: ["tensions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_tensions" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(
        JSON.stringify({ error: "AI gateway error", status: aiRes.status, body: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { tensions: [] };
    const beliefIds = new Set(beliefs.map((b: any) => b.id));
    const layerById = new Map(beliefs.map((b: any) => [b.id, b.layer]));
    const incoming: any[] = (args.tensions ?? []).filter(
      (t: any) => t.a_id !== t.b_id && beliefIds.has(t.a_id) && beliefIds.has(t.b_id),
    );

    // Replace existing OPEN tensions for this user with the fresh pass
    await supabase
      .from("belief_tensions")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "open");

    const rows = incoming.map((t) => ({
      user_id: user.id,
      a_id: t.a_id,
      b_id: t.b_id,
      layer: layerById.get(t.a_id) ?? null,
      severity: Math.max(0, Math.min(100, Math.round(t.severity ?? 50))),
      summary: t.summary ?? "Unspecified tension",
      explanation: t.explanation ?? null,
      suggested_resolution: t.suggested_resolution ?? null,
      status: "open",
    }));

    if (rows.length) {
      const { error: insErr } = await supabase.from("belief_tensions").insert(rows);
      if (insErr) throw insErr;
    }

    return new Response(
      JSON.stringify({ ok: true, count: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});