import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { topic, days } = (await req.json()) as { topic?: string; days?: number };
    if (!topic?.trim()) return new Response(JSON.stringify({ error: "topic required" }), { status: 400, headers: corsHeaders });
    const totalDays = Math.max(3, Math.min(30, days ?? 7));

    const { data: beliefs } = await supabase.from("belief_nodes")
      .select("id,layer,topic,statement,answer,confidence").eq("user_id", u.user.id);
    const beliefSummary = (beliefs ?? []).map((b: any) =>
      `id=${b.id} | ${b.layer} | ${b.topic}: ${b.statement} | confidence=${b.confidence}`).join("\n").slice(0, 6000);

    const prompt = `You are designing a personal Bible-study plan on the topic: "${topic.trim()}". The user is examining their faith framework. Use their beliefs below to highlight what they already affirm, where their framework is silent or thin, and where major counter-positions deserve airtime.

USER FRAMEWORK:
${beliefSummary || "(empty)"}

Produce a ${totalDays}-day plan. Be honest, non-denominational, and generous to multiple traditions.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "submit_study",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence overview of the topic" },
                sections: {
                  type: "array",
                  description: "Thematic sections of the study",
                  items: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      framework_alignment: { type: "string", description: "What the user's framework already says, or 'gap' if silent" },
                      passages: { type: "array", items: { type: "object", properties: { ref: { type: "string" }, why: { type: "string" } }, required: ["ref"] } },
                      counter_positions: { type: "array", items: { type: "string" } },
                      related_belief_ids: { type: "array", items: { type: "string" } },
                    },
                    required: ["heading", "passages"],
                  },
                },
                schedule: {
                  type: "array",
                  description: `${totalDays}-day reading schedule`,
                  items: {
                    type: "object",
                    properties: {
                      day: { type: "number" },
                      reference: { type: "string" },
                      focus: { type: "string" },
                      prompt: { type: "string" },
                    },
                    required: ["day", "reference"],
                  },
                },
              },
              required: ["summary", "sections", "schedule"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_study" } },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "AI gateway", status: r.status, body: t }), { status: 502, headers: corsHeaders });
    }
    const j = await r.json();
    const args = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    const validIds = new Set((beliefs ?? []).map((b: any) => b.id));
    const relatedAll = new Set<string>();
    for (const s of args.sections ?? []) {
      const filtered = (s.related_belief_ids ?? []).filter((id: string) => validIds.has(id));
      s.related_belief_ids = filtered;
      filtered.forEach((id: string) => relatedAll.add(id));
    }

    const { data: ins, error: insErr } = await supabase.from("study_plans").insert({
      user_id: u.user.id,
      topic: topic.trim(),
      summary: args.summary ?? "",
      sections: args.sections ?? [],
      schedule: args.schedule ?? [],
      related_belief_ids: Array.from(relatedAll),
    }).select("id").maybeSingle();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, id: ins?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});