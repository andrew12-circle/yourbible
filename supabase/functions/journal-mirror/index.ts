import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = u.user.id;

    const body = await req.json().catch(() => ({}));
    const kind: string = body.kind === "weekly" ? "weekly" : "on_demand";
    const days: number = Number(body.days) || 30;
    const rangeEnd = new Date();
    const rangeStart = new Date(rangeEnd.getTime() - days * 86400000);

    // Pull scored entries in range, joined with their entries.
    const { data: scores } = await supabase
      .from("journal_entry_scores")
      .select("entry_id,axes,themes,assumptions,journal_entries!inner(id,title,body,entry_at_ts,analyze_for_mirror)")
      .eq("user_id", userId)
      .gte("created_at", rangeStart.toISOString());

    const rows = (scores ?? []).filter((s: any) => s.journal_entries?.analyze_for_mirror);
    if (rows.length < 3) {
      return new Response(JSON.stringify({ error: "Need at least 3 scored entries with mirror toggle ON." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate
    const axisKeys = ["love_fear","trust_abandonment","grace_guilt","hope_despair","agency_helplessness","gratitude_resentment"];
    const aggregate: Record<string, number> = {};
    for (const k of axisKeys) {
      const vals = rows.map((r: any) => Number(r.axes?.[k] ?? 0)).filter((v: number) => !Number.isNaN(v));
      aggregate[k] = vals.length ? +(vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(3) : 0;
    }
    // Percent of entries skewing negative on each axis (< -0.2)
    const negPct: Record<string, number> = {};
    for (const k of axisKeys) {
      const negCount = rows.filter((r: any) => Number(r.axes?.[k] ?? 0) < -0.2).length;
      negPct[k] = Math.round((negCount / rows.length) * 100);
    }

    // Beliefs
    const { data: beliefs } = await supabase
      .from("belief_nodes")
      .select("id,topic,statement,answer,confidence")
      .eq("user_id", userId);

    // Compact entry samples for the model
    const samples = rows.slice(0, 40).map((r: any) => ({
      entry_id: r.entry_id,
      excerpt: (r.journal_entries.body ?? "").slice(0, 400),
      axes: r.axes,
      themes: r.themes,
      assumptions: r.assumptions,
    }));

    const prompt = `You analyze a user's journal vs. their stated beliefs to find DISSONANCE — places where lived patterns contradict claimed convictions.

Aggregate axis means (-1..+1, +1 = positive pole):
${JSON.stringify(aggregate)}

Percent of entries skewing strongly negative on each axis:
${JSON.stringify(negPct)}

Stated beliefs (id, topic, statement, confidence 0-100):
${(beliefs ?? []).map((b: any) => `- ${b.id} | ${b.topic} | "${b.statement}" (conf ${b.confidence})`).join("\n") || "(none)"}

Sample of scored entries (most recent first):
${samples.map((s, i) => `[${i}] entry_id=${s.entry_id} themes=${(s.themes||[]).join("; ")} assumptions=${(s.assumptions||[]).join("; ")}\n  excerpt: ${s.excerpt.replace(/\\n/g," ")}`).join("\n")}

Find up to 5 real conflicts. Phrase summaries like the user's example: "You claim X, but Y% of your entries assume Z."
For each conflict include 2-3 short evidence excerpts (quotes from the entries above, with their entry_id).
Return only genuine dissonance — if a stated belief is consistent with the data, do not include it.
Sort by severity descending. If nothing meaningful, return an empty array.`;

    const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-pro",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "report_conflicts",
            parameters: {
              type: "object",
              properties: {
                conflicts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      belief_id: { type: "string" },
                      belief_statement: { type: "string" },
                      axis: { type: "string" },
                      severity: { type: "number" },
                      percentage: { type: "number" },
                      summary: { type: "string" },
                      detail: { type: "string" },
                      evidence_excerpts: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            entry_id: { type: "string" },
                            quote: { type: "string" },
                          },
                          required: ["quote"],
                        },
                      },
                      reflection_prompt: { type: "string" },
                    },
                    required: ["summary"],
                  },
                },
              },
              required: ["conflicts"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_conflicts" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI gateway error", body: text }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiRes.json();
    const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc ? JSON.parse(tc.function.arguments) : { conflicts: [] };

    const { data: report, error: insErr } = await supabase
      .from("journal_mirror_reports")
      .insert({
        user_id: userId,
        range_start: rangeStart.toISOString(),
        range_end: rangeEnd.toISOString(),
        kind,
        aggregate: { means: aggregate, negative_percent: negPct, scored_count: rows.length },
        conflicts: args.conflicts ?? [],
      })
      .select("id")
      .maybeSingle();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, report_id: report?.id, count: (args.conflicts ?? []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});