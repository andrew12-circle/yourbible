import { supabase } from "@/integrations/supabase/client";

import { MAX_POLISH_CHARS, safePolishedText } from "./safePolish";

const SYSTEM = `You lightly copyedit personal faith journaling or framework answers. Reply with ONLY a JSON object: {"polished":"..."}.
Rules:
- Fix spelling, grammar, punctuation, and obvious typos only.
- Preserve meaning, voice, first/second person, and theological intent; do not rephrase for style or "improve" theology.
- Do not add ideas, remove content, or change doctrine.
- If nothing needs fixing, return the input unchanged in "polished".`;

function escapeForPrompt(s: string) {
  return s.replace(/"""/g, "'''");
}

function parsePolishedJson(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as { polished?: string };
    if (typeof parsed.polished === "string" && parsed.polished.length > 0) return parsed.polished;
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * Optional direct OpenAI-compatible chat/completions URL (never commit secrets).
 * Set `VITE_AI_POLISH_URL` + `VITE_AI_POLISH_KEY` in `.env` for a personal proxy;
 * otherwise the app calls the Supabase edge function `ai-text-polish` (server `GEMINI_API_KEY`).
 */
export function isDirectPolishEnvConfigured(): boolean {
  const url = import.meta.env.VITE_AI_POLISH_URL?.trim();
  const key = import.meta.env.VITE_AI_POLISH_KEY?.trim();
  return Boolean(url && key);
}

export async function polishText(text: string, signal?: AbortSignal, journalEntryId?: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  // Never send a prefix that could replace a whole long entry. Native spelling remains available.
  if (text.length > MAX_POLISH_CHARS) return text;
  const slice = text;

  const directUrl = import.meta.env.VITE_AI_POLISH_URL?.trim();
  const directKey = import.meta.env.VITE_AI_POLISH_KEY?.trim();
  if (directUrl && directKey) {
    const model = import.meta.env.VITE_AI_POLISH_MODEL?.trim() || "gpt-4o-mini";
    const r = await fetch(directUrl, {
      method: "POST", signal,
      headers: { Authorization: `Bearer ${directKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `TEXT:\n"""${escapeForPrompt(slice)}"""` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const rawText = await r.text();
    if (!r.ok) {
      throw new Error(rawText || `Polish failed (${r.status})`);
    }
    const j = JSON.parse(rawText) as { choices?: { finish_reason?: string; message?: { content?: string } }[] };
    if (j.choices?.[0]?.finish_reason === "length") return text;
    const content = j.choices?.[0]?.message?.content ?? "{}";
    return safePolishedText(text, parsePolishedJson(content, text));
  }

  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Sign in to use AI polish.");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-text-polish`;
  const r = await fetch(url, {
    method: "POST", signal,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: slice, ...(journalEntryId ? { journal_entry_id: journalEntryId } : {}) }),
  });
  const rawText = await r.text();
  if (!r.ok) {
    let msg = rawText || `Polish failed (${r.status})`;
    try {
      const err = JSON.parse(rawText) as { error?: string };
      if (err.error) msg = err.error;
    } catch {
      /* keep msg */
    }
    throw new Error(msg);
  }
  const j = JSON.parse(rawText) as { polished?: string };
  if (typeof j.polished === "string") return safePolishedText(text, j.polished);
  return slice;
}
