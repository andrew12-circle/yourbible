// Streaming Socratic chat that knows the user's framework.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODE_PROMPTS: Record<string, string> = {
  socratic:
    "You are a Socratic sparring partner for the user's faith framework. Ask sharp, honest questions. Cite scripture when relevant. Never speak as God or push a denomination. Never declare what is true; surface tensions, sources, and counter-positions. Be warm but unflinching.",
  devil:
    "You are a charitable steel-man of the strongest disagreement with the user's framework. Argue the opposite view with the best available reasoning and scripture. End with one honest concession the opposing view should make. Never bully.",
  pastor:
    "You are a thoughtful, non-denominational pastoral companion. Listen first. Reflect back what you hear. Offer scripture as invitation, not weapon. Never moralize. Always preserve the user's agency.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const KEY = Deno.env.get("GEMINI_API_KEY")?.trim() ?? "";
    if (!KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
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

    const { thread_id, content } = (await req.json()) as { thread_id?: string; content?: string };
    if (!thread_id || !content?.trim()) {
      return new Response(JSON.stringify({ error: "thread_id and content required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: thread } = await supabase
      .from("chat_threads")
      .select("id,mode,title,user_id")
      .eq("id", thread_id)
      .maybeSingle();
    if (!thread || thread.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist the user message immediately
    await supabase.from("chat_messages").insert({
      user_id: userId, thread_id, role: "user", content: content.trim(),
    });

    // Pull framework context + prior thread messages
    const [{ data: beliefs }, { data: tensions }, { data: history }] = await Promise.all([
      supabase.from("belief_nodes").select("layer,topic,statement,answer,confidence").eq("user_id", userId),
      supabase.from("belief_tensions").select("summary,severity").eq("user_id", userId).eq("status", "open").limit(15),
      supabase.from("chat_messages").select("role,content").eq("thread_id", thread_id).order("created_at", { ascending: true }).limit(60),
    ]);

    const beliefSummary = (beliefs ?? []).map((b: any) =>
      `- [${b.layer}] ${b.topic}: ${b.statement} | answer=${(b.answer ?? "").slice(0, 220)} | confidence=${b.confidence}`
    ).join("\n").slice(0, 8000);
    const tensionSummary = (tensions ?? []).map((t: any) => `- (sev ${t.severity}) ${t.summary}`).join("\n");

    const system = `${MODE_PROMPTS[thread.mode] ?? MODE_PROMPTS.socratic}

THE USER'S FRAMEWORK (private, do not reveal verbatim unless asked):
${beliefSummary || "(empty — invite them to seed their framework)"}

OPEN TENSIONS:
${tensionSummary || "(none)"}

Markdown is supported. Cite scripture as "(Book Ch:V)". Keep responses tight unless the user invites depth.`;

    const messages = [
      { role: "system", content: system },
      ...((history ?? []) as { role: string; content: string }[]),
    ];

    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gemini-2.5-pro", messages, stream: true }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(JSON.stringify({ error: "AI gateway", status: upstream.status, body: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Stream SSE deltas as plain text chunks; persist final on close.
    let assistantText = "";
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buf = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const l = line.trim();
              if (!l.startsWith("data:")) continue;
              const payload = l.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const j = JSON.parse(payload);
                const delta = j.choices?.[0]?.delta?.content;
                if (typeof delta === "string" && delta.length) {
                  assistantText += delta;
                  controller.enqueue(encoder.encode(delta));
                }
              } catch { /* ignore */ }
            }
          }
        } catch (e) {
          console.error("stream err", e);
        } finally {
          if (assistantText) {
            await supabase.from("chat_messages").insert({
              user_id: userId, thread_id, role: "assistant", content: assistantText,
            });
            // Auto-title first reply
            if (thread.title === "New conversation") {
              const t = content.trim().slice(0, 60);
              await supabase.from("chat_threads").update({ title: t }).eq("id", thread_id);
            } else {
              await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", thread_id);
            }
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});