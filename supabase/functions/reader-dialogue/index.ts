// Reader Companion — streaming Socratic dialogue scoped to a passage + journal.
// Tools: search_my_artifacts, propose_beliefs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  action: "chat" | "search_artifacts" | "propose_beliefs";
  thread_id?: string;
  content?: string;
  scope?: { book: string; bookName: string; chapter: number; verses: number[]; passageText: string };
  journal_draft?: string;
  query?: string;
}

function ref(s: NonNullable<Body["scope"]>) {
  if (!s.verses.length) return `${s.bookName} ${s.chapter}`;
  if (s.verses.length === 1) return `${s.bookName} ${s.chapter}:${s.verses[0]}`;
  return `${s.bookName} ${s.chapter}:${s.verses[0]}-${s.verses[s.verses.length - 1]}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");
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
    const body = (await req.json()) as Body;

    // ---------- artifact search ----------
    if (body.action === "search_artifacts") {
      const q = (body.query ?? "").toLowerCase().trim();
      const refStr = body.scope ? ref(body.scope) : "";
      const { data: arts } = await supabase
        .from("artifacts")
        .select("id,title,raw_text")
        .eq("user_id", userId)
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(50);
      const { data: claims } = await supabase
        .from("artifact_claims")
        .select("id,artifact_id,claim,verdict,scripture_supports,scripture_challenges")
        .eq("user_id", userId)
        .limit(200);
      // naive scoring: keyword overlap with query OR passage ref
      const tokens = new Set(
        (q + " " + refStr).toLowerCase().split(/\W+/).filter(t => t.length > 3),
      );
      const score = (txt: string) => {
        const w = txt.toLowerCase();
        let s = 0;
        tokens.forEach(t => { if (w.includes(t)) s += 1; });
        return s;
      };
      const titleById = new Map((arts ?? []).map(a => [a.id, a.title ?? "(untitled)"]));
      const ranked = (claims ?? [])
        .map(c => ({ c, s: score(c.claim) + (JSON.stringify(c.scripture_supports ?? []).toLowerCase().includes(refStr.toLowerCase()) ? 3 : 0) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 5)
        .map(x => ({
          id: x.c.id,
          artifact_id: x.c.artifact_id,
          artifact_title: titleById.get(x.c.artifact_id) ?? "(untitled)",
          claim: x.c.claim,
          verdict: x.c.verdict,
        }));
      return new Response(JSON.stringify({ results: ranked }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- propose beliefs ----------
    if (body.action === "propose_beliefs") {
      if (!body.scope) {
        return new Response(JSON.stringify({ error: "scope required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const refStr = ref(body.scope);
      let convo = "";
      if (body.thread_id) {
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("role,content")
          .eq("thread_id", body.thread_id)
          .order("created_at", { ascending: true })
          .limit(40);
        convo = (msgs ?? []).map((m: { role: string; content: string }) =>
          `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
      }
      const sys = `You distill a reader's reflection into 1-3 candidate BELIEF STATEMENTS they could save.
Each belief must be:
- a single declarative sentence in the user's own voice
- specific to their thinking (not generic theology)
- honest about uncertainty if they were uncertain

Return ONLY JSON of the shape:
{ "candidates": [ { "statement": "...", "topic": "...", "layer": "foundations|life|mechanics|emotional", "confidence": 1-100, "tags": ["..."], "rationale": "1 sentence" } ] }`;
      const user = `Passage: ${refStr}
"""${body.scope.passageText}"""

Their journal draft:
"""${body.journal_draft ?? ""}"""

Their dialogue with the AI companion:
"""${convo}"""

Propose 1-3 belief candidates.`;
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: "ai gateway", body: t }), {
          status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const j = await r.json();
      const text = j.choices?.[0]?.message?.content ?? "{}";
      let parsed: unknown = {};
      try { parsed = JSON.parse(text); } catch { /* */ }
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- chat (default) ----------
    if (!body.thread_id || !body.content?.trim() || !body.scope) {
      return new Response(JSON.stringify({ error: "thread_id, content, scope required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: thread } = await supabase
      .from("chat_threads")
      .select("id,mode,title,user_id")
      .eq("id", body.thread_id)
      .maybeSingle();
    if (!thread || thread.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await supabase.from("chat_messages").insert({
      user_id: userId, thread_id: body.thread_id, role: "user", content: body.content.trim(),
    });
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role,content")
      .eq("thread_id", body.thread_id)
      .order("created_at", { ascending: true })
      .limit(60);
    const refStr = ref(body.scope);
    const sys = `You are a Socratic companion helping the user think through Scripture they just read.
They are reading: ${refStr}
"""${body.scope.passageText}"""

Their current journal draft:
"""${body.journal_draft ?? "(empty)"}"""

Rules:
- Ask sharp follow-up questions that deepen their thinking. Do not deliver verdicts.
- Cite scripture as "(Book Ch:V)" when it sharpens the question.
- Keep replies tight (2-5 sentences) unless they invite depth.
- Never push a denomination. Acknowledge mystery.
Markdown is supported.`;
    const messages = [
      { role: "system", content: sys },
      ...((history ?? []) as { role: string; content: string }[]),
    ];
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, stream: true }),
    });
    if (upstream.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (upstream.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(JSON.stringify({ error: "AI gateway", body: text }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
        } catch (e) { console.error("stream err", e); }
        finally {
          if (assistantText) {
            await supabase.from("chat_messages").insert({
              user_id: userId, thread_id: body.thread_id!, role: "assistant", content: assistantText,
            });
            if (thread.title === "New conversation") {
              await supabase.from("chat_threads")
                .update({ title: `Reading ${refStr}` }).eq("id", body.thread_id!);
            } else {
              await supabase.from("chat_threads")
                .update({ updated_at: new Date().toISOString() }).eq("id", body.thread_id!);
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