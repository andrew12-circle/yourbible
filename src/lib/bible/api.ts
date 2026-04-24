import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export interface PassageVerse { number: number; text: string; }
export interface Passage { reference: string; verses: PassageVerse[]; }

export interface BibleEntry {
  id: string;
  abbreviation: string;
  name: string;
  language: { id: string; name: string };
  description?: string;
}

const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function listBibles(): Promise<BibleEntry[]> {
  const r = await fetch(`${FUNCTIONS_BASE}/bible-passage?action=bibles`, {
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON },
  });
  if (!r.ok) throw new Error(`bibles: ${r.status}`);
  const json = await r.json();
  return (json?.data ?? []) as BibleEntry[];
}

export async function fetchPassage(bibleId: string, book: string, chapter: number): Promise<Passage> {
  const u = new URL(`${FUNCTIONS_BASE}/bible-passage`);
  u.searchParams.set("bibleId", bibleId);
  u.searchParams.set("book", book);
  u.searchParams.set("chapter", String(chapter));
  const r = await fetch(u.toString(), { headers: { Authorization: `Bearer ${ANON}`, apikey: ANON } });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`passage ${r.status}: ${err}`);
  }
  return r.json();
}

export async function streamVerseAI(opts: {
  mode: "summary" | "context" | "apply" | "deep" | "chat";
  reference: string;
  verseText: string;
  question?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  onDelta: (chunk: string) => void;
  onError?: (msg: string) => void;
  signal?: AbortSignal;
}) {
  const { onDelta, onError, signal, ...body } = opts;
  const resp = await fetch(`${FUNCTIONS_BASE}/verse-ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const t = await resp.text().catch(() => "");
    let msg = "AI request failed";
    try { msg = JSON.parse(t).error ?? msg; } catch { /* */ }
    onError?.(msg);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;
  while (!done) {
    const { value, done: d } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(payload);
        const c = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
}

export async function fetchSleepAudio(text: string, voiceId?: string): Promise<Blob> {
  const r = await fetch(`${FUNCTIONS_BASE}/sleep-tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify({ text, voiceId }),
  });
  if (!r.ok) throw new Error(`sleep-tts: ${r.status}`);
  return r.blob();
}

// suppress unused import warning
void supabase;
