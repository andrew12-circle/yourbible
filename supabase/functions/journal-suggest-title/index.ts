/**
 * Suggests a short journal entry title from body text via Gemini.
 * Persists to journal_entries.title when the entry has no title yet.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MAX_BODY = 8_000;

function stripForTitle(body: string): string {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^\*\*From your sketch\*\*[^\n]*\n+/im, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_BODY);
}

async function geminiTitle(prose: string): Promise<string | null> {
  const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            `You title private faith journal entries. Reply with ONLY JSON: {"title":"..."}.
Rules:
- 4–12 words, sentence case, no quotes or trailing period.
- Capture the emotional or spiritual core, not generic labels like "Journal entry".
- Never invent facts not present in the text.`,
        },
        { role: "user", content: `Entry text:\n\n${prose}` },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiRes.ok) return null;
  const aiJson = await aiRes.json();
  const content = aiJson.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  try {
    const parsed = JSON.parse(content) as { title?: string };
    const t = typeof parsed.title === "string" ? parsed.title.trim() : "";
    return t ? t.slice(0, 120) : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY missing" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const body = (await req.json()) as { entry_id?: string; body?: string };
    let prose = typeof body.body === "string" ? stripForTitle(body.body) : "";
    const entryId = typeof body.entry_id === "string" ? body.entry_id : null;

    if (entryId) {
      const { data: entry } = await supabase
        .from("journal_entries")
        .select("id,title,body,summary,user_id")
        .eq("id", entryId)
        .maybeSingle();
      if (!entry || entry.user_id !== u.user.id) {
        return new Response(JSON.stringify({ error: "Entry not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (entry.title?.trim()) {
        return new Response(
          JSON.stringify({ ok: true, title: entry.title.trim(), persisted: false, skipped: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!prose) {
        const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
        prose = stripForTitle(summary || String(entry.body ?? ""));
      }
    }

    if (prose.length < 20) {
      return new Response(JSON.stringify({ error: "Not enough text for a title" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = await geminiTitle(prose);
    if (!title) {
      return new Response(JSON.stringify({ error: "Could not generate title" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let persisted = false;
    if (entryId) {
      const { error: upErr } = await supabase
        .from("journal_entries")
        .update({ title })
        .eq("id", entryId)
        .eq("user_id", u.user.id)
        .is("title", null);
      if (!upErr) persisted = true;
      else {
        const { error: upErr2 } = await supabase
          .from("journal_entries")
          .update({ title })
          .eq("id", entryId)
          .eq("user_id", u.user.id)
          .eq("title", "");
        persisted = !upErr2;
      }
    }

    return new Response(JSON.stringify({ ok: true, title, persisted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
