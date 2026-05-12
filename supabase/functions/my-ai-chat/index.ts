import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { buildFrameworkRetrievalContext, buildPartnerWalkingAppendixForAi } from "./retrieval.ts";
import { buildMyAiSystemPrompt } from "./systemPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";

type Citation = {
  source_type: "belief" | "journal" | "artifact" | "entity" | "identity" | "general" | "influence";
  id?: string;
  label: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractGeminiText(data: unknown): string {
  if (!isRecord(data)) return "";
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const first = candidates[0];
  if (!isRecord(first)) return "";
  const content = first.content;
  if (!isRecord(content)) return "";
  const parts = content.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (isRecord(p) && typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return fence ? fence[1].trim() : t;
}

function isCitationSourceType(v: string): v is Citation["source_type"] {
  return v === "belief" || v === "journal" || v === "artifact" || v === "entity" || v === "identity" ||
    v === "general" || v === "influence";
}

function parseCitationEntry(v: unknown): Citation | null {
  if (!isRecord(v)) return null;
  const st = typeof v.source_type === "string" ? v.source_type.trim() : "";
  if (!isCitationSourceType(st)) return null;
  const label = typeof v.label === "string" ? v.label.trim() : "";
  if (!label) return null;
  const id = typeof v.id === "string" && /^[0-9a-f-]{36}$/i.test(v.id) ? v.id : undefined;
  return id ? { source_type: st, id, label } : { source_type: st, label };
}

function parseModelJson(text: string): { reply: string; citations: Citation[] } | null {
  const raw = stripJsonFence(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
  if (!reply) return null;
  const rawCites = parsed.citations;
  const citations: Citation[] = [];
  if (Array.isArray(rawCites)) {
    for (const c of rawCites) {
      const p = parseCitationEntry(c);
      if (p) citations.push(p);
    }
  }
  return { reply, citations };
}

const BRACKET_PATTERNS: { re: RegExp; source_type: Citation["source_type"]; label: string }[] = [
  { re: /\[belief:([0-9a-f-]{36})\]/gi, source_type: "belief", label: "Belief" },
  { re: /\[journal:([0-9a-f-]{36})\]/gi, source_type: "journal", label: "Journal entry" },
  { re: /\[artifact:([0-9a-f-]{36})\]/gi, source_type: "artifact", label: "Artifact" },
  { re: /\[entity:([0-9a-f-]{36})\]/gi, source_type: "entity", label: "Entity" },
  { re: /\[influence:([0-9a-f-]{36})\]/gi, source_type: "influence", label: "Influence" },
];

function extractBracketCitations(reply: string): Citation[] {
  const out: Citation[] = [];
  for (const { re, source_type, label } of BRACKET_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(reply)) !== null) {
      const id = m[1];
      out.push({ source_type, id, label });
    }
  }
  return out;
}

function dedupeCitations(items: Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of items) {
    const key = `${c.source_type}|${c.id ?? ""}|${c.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function looksLikeGeneralKnowledgeFallback(reply: string): Citation[] {
  const t = reply.toLowerCase();
  if (t.includes("nothing in your framework speaks") && t.includes("general knowledge")) {
    return [{ source_type: "general", label: "General knowledge (fallback)" }];
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const body = (await req.json()) as {
      chat_id?: string | null;
      message?: string;
      include_general_knowledge?: boolean;
    };

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return jsonResponse({ error: "message is required" }, 400);
    }

    const includeGeneral = body.include_general_knowledge !== false;

    let chatId = typeof body.chat_id === "string" && body.chat_id.length ? body.chat_id : null;

    if (chatId) {
      const { data: existing, error: exErr } = await supabase
        .from("my_ai_chats")
        .select("id,user_id")
        .eq("id", chatId)
        .maybeSingle();
      if (exErr) return jsonResponse({ error: exErr.message }, 502);
      if (!existing || existing.user_id !== userId) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
    } else {
      const { data: created, error: cErr } = await supabase
        .from("my_ai_chats")
        .insert({ user_id: userId })
        .select("id")
        .single();
      if (cErr || !created) {
        return jsonResponse({ error: cErr?.message ?? "Failed to create chat" }, 502);
      }
      chatId = created.id as string;
    }

    const { count: priorUserCount, error: cntErr } = await supabase
      .from("my_ai_messages")
      .select("*", { count: "exact", head: true })
      .eq("chat_id", chatId)
      .eq("role", "user");
    if (cntErr) return jsonResponse({ error: cntErr.message }, 502);
    const isFirstUserMessage = (priorUserCount ?? 0) === 0;

    const { error: insUserErr } = await supabase.from("my_ai_messages").insert({
      user_id: userId,
      chat_id: chatId,
      role: "user",
      content: message,
      citations: [],
    });
    if (insUserErr) return jsonResponse({ error: insUserErr.message }, 502);

    if (isFirstUserMessage) {
      const title = message.replace(/\s+/g, " ").trim().slice(0, 80);
      await supabase.from("my_ai_chats").update({ title }).eq("id", chatId).eq("user_id", userId);
    }

    const contextPack = await buildFrameworkRetrievalContext(supabase, userId, chatId, message);
    const partnerAppendix = await buildPartnerWalkingAppendixForAi(supabase, userId);
    const systemText = buildMyAiSystemPrompt(includeGeneral, partnerAppendix);

    const userPayload =
      `${contextPack.contextBlock}\n\n---\nUser message:\n${message}\n\nReturn only JSON as specified in the system instructions.`;

    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "GEMINI_API_KEY is not configured." }, 502);
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents: [{ role: "user", parts: [{ text: userPayload }] }],
          generationConfig: {
            temperature: 0.42,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      return jsonResponse(
        { error: `Gemini request failed (${geminiRes.status}): ${errText.slice(0, 500)}` },
        502,
      );
    }

    const geminiJson: unknown = await geminiRes.json().catch(() => null);
    const rawText = extractGeminiText(geminiJson);

    let reply = rawText;
    let citations: Citation[] = [];

    const parsed = parseModelJson(rawText);
    if (parsed) {
      reply = parsed.reply;
      citations = parsed.citations;
    } else {
      let loose = stripJsonFence(rawText);
      try {
        const j: unknown = JSON.parse(loose);
        if (isRecord(j) && typeof j.reply === "string" && j.reply.trim()) {
          reply = j.reply.trim();
        } else {
          reply = loose;
        }
      } catch {
        reply = loose;
      }
      citations = [];
    }

    const bracketCites = extractBracketCitations(reply);
    const fallbackGeneral = looksLikeGeneralKnowledgeFallback(reply);
    citations = dedupeCitations([...citations, ...bracketCites, ...fallbackGeneral]);

    const { data: asstRow, error: asstErr } = await supabase
      .from("my_ai_messages")
      .insert({
        user_id: userId,
        chat_id: chatId,
        role: "assistant",
        content: reply,
        citations,
      })
      .select("id")
      .single();

    if (asstErr || !asstRow) {
      return jsonResponse({ error: asstErr?.message ?? "Failed to save assistant message" }, 502);
    }

    const { data: chatRow } = await supabase
      .from("my_ai_chats")
      .select("title")
      .eq("id", chatId)
      .maybeSingle();

    const patch: { updated_at: string; title?: string } = {
      updated_at: new Date().toISOString(),
    };
    if (!chatRow?.title?.trim()) {
      patch.title = message.replace(/\s+/g, " ").trim().slice(0, 80);
    }

    await supabase.from("my_ai_chats").update(patch).eq("id", chatId).eq("user_id", userId);

    return jsonResponse({
      chat_id: chatId,
      assistant_message_id: asstRow.id as string,
      content: reply,
      citations,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
