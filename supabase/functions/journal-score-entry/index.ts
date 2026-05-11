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

    const { entry_id } = await req.json();
    if (!entry_id) {
      return new Response(JSON.stringify({ error: "entry_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: entry } = await supabase
      .from("journal_entries")
      .select("id,title,body,mood,tags,verse_ref")
      .eq("id", entry_id)
      .maybeSingle();
    if (!entry) {
      return new Response(JSON.stringify({ error: "Entry not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Score this journal entry on six bipolar axes from -1 to +1.
The first label in each axis name is the POSITIVE pole (+1); second label is the NEGATIVE pole (-1).
Axes: love_fear, trust_abandonment, grace_guilt, hope_despair, agency_helplessness, gratitude_resentment.
Also extract 1-5 themes (short phrases) and 1-5 implicit assumptions the writer is making about God, self, or others.
Be honest, not flattering. If the entry is too short or neutral, return small magnitudes (e.g. 0.05) rather than 0.

Title: ${entry.title ?? "(none)"}
Tags: ${(entry.tags ?? []).join(", ") || "(none)"}
Verse: ${entry.verse_ref ?? "(none)"}
Mood: ${entry.mood ?? "n/a"}

Body:
${entry.body}`;

    const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "score_entry",
            parameters: {
              type: "object",
              properties: {
                axes: {
                  type: "object",
                  properties: {
                    love_fear: { type: "number" },
                    trust_abandonment: { type: "number" },
                    grace_guilt: { type: "number" },
                    hope_despair: { type: "number" },
                    agency_helplessness: { type: "number" },
                    gratitude_resentment: { type: "number" },
                  },
                  required: ["love_fear","trust_abandonment","grace_guilt","hope_despair","agency_helplessness","gratitude_resentment"],
                },
                themes: { type: "array", items: { type: "string" } },
                assumptions: { type: "array", items: { type: "string" } },
              },
              required: ["axes", "themes", "assumptions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "score_entry" } },
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
    if (!tc) {
      return new Response(JSON.stringify({ error: "No tool call" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(tc.function.arguments);

    // Upsert
    await supabase.from("journal_entry_scores").delete().eq("entry_id", entry_id);
    const { error: insErr } = await supabase.from("journal_entry_scores").insert({
      entry_id,
      user_id: u.user.id,
      axes: args.axes ?? {},
      themes: args.themes ?? [],
      assumptions: args.assumptions ?? [],
    });
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});