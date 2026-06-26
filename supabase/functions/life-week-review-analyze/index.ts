import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReviewSample = {
  subject: string;
  person: string;
  week_start: string;
  week_index: number;
  reflection: string;
  completed_at: string;
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = u.user.id;
    const body = (await req.json().catch(() => ({}))) as {
      weeks?: number;
      reviews?: ReviewSample[];
    };
    const weeks = Math.max(2, Math.min(26, body.weeks ?? 8));

    let samples: ReviewSample[] = Array.isArray(body.reviews)
      ? body.reviews.filter((r) => r?.reflection?.trim()).slice(0, weeks * 3)
      : [];

    if (samples.length === 0) {
      const { data: rows, error } = await supabase
        .from("life_week_reviews")
        .select("subject, week_index, week_start, reflection, completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(weeks * 3);

      if (error) throw error;

      samples = (rows ?? []).map((r: Record<string, unknown>) => ({
        subject: String(r.subject ?? "self"),
        person: String(r.subject ?? "self") === "self" ? "Me" : String(r.subject),
        week_start: String(r.week_start),
        week_index: Number(r.week_index),
        reflection: String(r.reflection ?? "").slice(0, 1200),
        completed_at: String(r.completed_at),
      }));
    }

    if (samples.length < 1) {
      return new Response(JSON.stringify({ error: "Need at least 1 week close-out reflection." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a thoughtful life coach helping someone review how they spend their weeks — spiritually, with family, and personally. They close out each week with short reflections about themselves and sometimes about family members (Lilly, Caroline).

REFLECTIONS (newest first):
${JSON.stringify(samples, null, 2)}

Write a private synopsis to help them see patterns and spend time better. Be honest, warm, and practical — not preachy. Use second person ("you").

Return JSON only via the tool with:
- title: short (max 8 words)
- summary: 2–3 sentences on how they're living lately
- patterns: array of 2–4 { heading, body } — recurring themes in how they spend time
- opportunities: array of 2–3 concrete, gentle suggestions for the coming weeks
- questions: 2–3 reflective questions they could sit with`;

    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-pro",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "submit_synopsis",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                patterns: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      body: { type: "string" },
                    },
                    required: ["heading", "body"],
                  },
                },
                opportunities: { type: "array", items: { type: "string" } },
                questions: { type: "array", items: { type: "string" } },
              },
              required: ["title", "summary", "patterns", "opportunities", "questions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_synopsis" } },
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "AI gateway", status: r.status, body: t }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await r.json();
    const args = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");

    return new Response(JSON.stringify({ ok: true, ...args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
