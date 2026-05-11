// Verse AI — Gemini API, returns either structured breakdown or chat reply.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

interface Body {
  mode: "summary" | "context" | "apply" | "deep" | "chat";
  reference: string;       // e.g. "John 3:16"
  verseText: string;
  history?: { role: "user" | "assistant"; content: string }[];
  question?: string;       // for mode=chat
}

const MODE_PROMPT: Record<Body["mode"], string> = {
  summary: "In 2-3 sentences, summarize what this verse is saying in plain language. Avoid jargon. Be warm but precise.",
  context: "Explain the historical, literary, and cultural context of this verse in 3-5 sentences. Who wrote it, to whom, when, and what surrounds it in the chapter.",
  apply: "Offer 2-3 concrete, gentle ways someone today might live out this verse. Personal, never preachy. Use 'you' sparingly.",
  deep: "Provide a deeper exegetical look: original-language nuances (Hebrew/Greek where relevant), key theological themes, and a few cross-references with one-line explanations.",
  chat: "Answer the user's question about this verse. Stay grounded in the text, be honest about uncertainty, cite cross-references when helpful.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

    const body = (await req.json()) as Body;
    if (!body?.mode || !body?.reference || !body?.verseText) {
      return new Response(JSON.stringify({ error: "mode, reference, verseText required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a thoughtful Bible study companion. You help readers understand Scripture clearly and personally.
You do NOT push a denomination. You acknowledge mystery where it exists.
The verse in focus: ${body.reference} — "${body.verseText}"
${MODE_PROMPT[body.mode]}`;

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: system },
    ];
    if (body.mode === "chat") {
      for (const m of body.history ?? []) messages.push(m);
      messages.push({ role: "user", content: body.question ?? "Tell me more about this verse." });
    } else {
      messages.push({ role: "user", content: `Please respond now for: ${body.reference}` });
    }

    const r = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error:", r.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(r.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("verse-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
