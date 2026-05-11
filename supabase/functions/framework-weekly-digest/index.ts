// Generates a weekly summary of framework activity using the Lovable AI Gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const KEY = Deno.env.get("GEMINI_API_KEY")!;
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
    const userId = u.user.id;
    const body = (await req.json().catch(() => ({}))) as { days?: number };
    const days = Math.max(1, Math.min(60, body.days ?? 7));
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    const [versions, artifacts, claims, tensions, beliefs] = await Promise.all([
      supabase.from("belief_versions").select("belief_id,snapshot,created_at").eq("user_id", userId).gte("created_at", start.toISOString()),
      supabase.from("artifacts").select("id,title,kind,status,created_at").eq("user_id", userId).gte("created_at", start.toISOString()),
      supabase.from("artifact_claims").select("claim,match_relation,verdict,bias_flags,created_at,matched_belief_id").eq("user_id", userId).gte("created_at", start.toISOString()),
      supabase.from("belief_tensions").select("summary,severity,status,a_id,b_id,created_at").eq("user_id", userId).gte("created_at", start.toISOString()),
      supabase.from("belief_nodes").select("id,topic,statement,confidence,layer").eq("user_id", userId),
    ]);

    const beliefById = new Map((beliefs.data ?? []).map((b: any) => [b.id, b]));

    // Compute confidence drift
    const drift: { topic: string; from: number; to: number }[] = [];
    for (const v of versions.data ?? []) {
      const cur = beliefById.get(v.belief_id);
      if (!cur) continue;
      const before = Number((v.snapshot as any)?.confidence ?? cur.confidence);
      if (before !== cur.confidence) drift.push({ topic: cur.topic, from: before, to: cur.confidence });
    }

    const summary = {
      range: { start: start.toISOString(), end: end.toISOString() },
      counts: {
        artifacts: artifacts.data?.length ?? 0,
        claims: claims.data?.length ?? 0,
        tensions: tensions.data?.length ?? 0,
        belief_changes: drift.length,
      },
      drift: drift.slice(0, 20),
      top_artifacts: (artifacts.data ?? []).slice(0, 8).map((a: any) => ({ title: a.title, kind: a.kind })),
      tensions: (tensions.data ?? []).slice(0, 8).map((t: any) => ({
        summary: t.summary, severity: t.severity, status: t.status,
        a: beliefById.get(t.a_id)?.topic, b: beliefById.get(t.b_id)?.topic,
      })),
      bias_flags_seen: Array.from(new Set((claims.data ?? []).flatMap((c: any) => c.bias_flags ?? []))).slice(0, 12),
      verdicts: (claims.data ?? []).reduce((acc: Record<string, number>, c: any) => {
        const v = c.verdict ?? "pending";
        acc[v] = (acc[v] ?? 0) + 1;
        return acc;
      }, {}),
    };

    const prompt = `You are writing a private weekly review of a person's belief framework. Be honest and pastoral — never preachy, never preachy across denominations. Use second person ("you").

DATA:
${JSON.stringify(summary, null, 2)}

Write:
- title: short, evocative (max 8 words)
- summary: 2–3 sentence overview of what shifted this week
- sections: 2–4 sections each with { heading, body (2–4 sentences), prompts: [1–3 short reflective questions] } covering: shifts in conviction, tensions to sit with, what artifacts revealed, gaps to revisit

If the week was quiet (few or no events), say so plainly — no padding.

Return JSON only.`;

    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-pro",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "submit_digest",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      body: { type: "string" },
                      prompts: { type: "array", items: { type: "string" } },
                    },
                    required: ["heading", "body"],
                  },
                },
              },
              required: ["title", "summary", "sections"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_digest" } },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "AI gateway", status: r.status, body: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const args = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");

    const { data: ins, error: insErr } = await supabase.from("framework_digests").insert({
      user_id: userId,
      range_start: start.toISOString(),
      range_end: end.toISOString(),
      title: args.title ?? "Weekly review",
      summary: args.summary ?? "",
      sections: args.sections ?? [],
      stats: summary.counts,
    }).select("id").maybeSingle();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, id: ins?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});