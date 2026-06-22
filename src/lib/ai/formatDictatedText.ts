import { supabase } from "@/integrations/supabase/client";
import { formatDictatedTextLocally } from "@/lib/ai/formatDictatedTextLocally";

const MAX_CHARS = 12_000;

const SYSTEM = `You transform raw speech-to-text journal dictation into readable prose. Reply with ONLY a JSON object: {"polished":"..."}.
Rules:
- Add proper sentence capitalization, punctuation, and paragraph breaks when the speaker shifts topic or pauses for a new thought.
- Fix obvious speech-recognition errors when context makes the intended word clear.
- Preserve every idea, prayer, name, and theological intent — do not add, remove, or soften content.
- Keep first-person voice; this is personal faith journaling.
- Use blank lines between paragraphs.
- Do not add titles, headers, bullet lists, or markdown unless the speaker explicitly dictated them.`;

function escapeForPrompt(s: string) {
  return s.replace(/"""/g, "'''");
}

function parseFormattedJson(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as { polished?: string };
    if (typeof parsed.polished === "string" && parsed.polished.length > 0) return parsed.polished;
  } catch {
    /* ignore */
  }
  return fallback;
}

function parseApiError(rawText: string, status: number): string {
  try {
    const err = JSON.parse(rawText) as { error?: string; body?: string };
    if (err.error && err.error !== "AI gateway error") return err.error;
    if (err.body) {
      try {
        const inner = JSON.parse(err.body) as { error?: { message?: string } };
        if (inner.error?.message) return inner.error.message;
      } catch {
        if (err.body.length < 200) return err.body;
      }
    }
    if (err.error) return err.error;
  } catch {
    /* ignore */
  }
  return rawText || `Format failed (${status})`;
}

/** Turn raw speech-to-text into readable journal prose (punctuation, sentences, paragraphs). */
export async function formatDictatedText(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const slice = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

  const directUrl = import.meta.env.VITE_AI_POLISH_URL?.trim();
  const directKey = import.meta.env.VITE_AI_POLISH_KEY?.trim();
  if (directUrl && directKey) {
    const model = import.meta.env.VITE_AI_POLISH_MODEL?.trim() || "gpt-4o-mini";
    const r = await fetch(directUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${directKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `RAW DICTATION:\n"""${escapeForPrompt(slice)}"""` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const rawText = await r.text();
    if (!r.ok) {
      throw new Error(rawText || `Format failed (${r.status})`);
    }
    const j = JSON.parse(rawText) as { choices?: { message?: { content?: string } }[] };
    const content = j.choices?.[0]?.message?.content ?? "{}";
    return parseFormattedJson(content, slice);
  }

  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Sign in to format dictation.");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-text-polish`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: slice, mode: "dictation" }),
  });
  const rawText = await r.text();
  if (!r.ok) {
    throw new Error(parseApiError(rawText, r.status));
  }
  const j = JSON.parse(rawText) as { polished?: string };
  if (typeof j.polished === "string" && j.polished.length > 0) return j.polished;
  return slice;
}

/** AI format with local heuristic fallback (offline / gateway errors). */
export async function formatDictatedTextWithFallback(text: string): Promise<{
  text: string;
  usedFallback: boolean;
}> {
  try {
    const formatted = await formatDictatedText(text);
    if (formatted.trim() && formatted !== text.trim()) {
      return { text: formatted, usedFallback: false };
    }
    const local = formatDictatedTextLocally(text);
    return { text: local !== text.trim() ? local : formatted, usedFallback: local !== text.trim() };
  } catch {
    const local = formatDictatedTextLocally(text);
    return { text: local, usedFallback: true };
  }
}
