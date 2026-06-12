import { EOTC_BIBLE_ENTRY, isEotcBibleId } from "@/lib/bible/canon";
import { sanitizePubVerseText } from "@/lib/bible/parsePassageHtml";
import { supabase } from "@/integrations/supabase/client";

export { EOTC_BIBLE_ID, isEotcBibleId } from "@/lib/bible/canon";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export interface PassageVerse { number: number; text: string; crossRefs?: PassageCrossRef[]; footnotes?: PassageFootnote[]; }
export interface PassageCrossRef { label: string; book: string; chapter: number; verse: number; }
export interface PassageFootnote { marker: number; text: string; }
export interface PassageHeading { beforeVerse: number; text: string; }
export interface Passage {
  reference: string;
  verses: PassageVerse[];
  paragraphStarts: number[];
  headings: PassageHeading[];
}

/** Ensure every verse has a string body (cached/API payloads can omit text). */
export function normalizePassage(raw: Partial<Passage> & Pick<Passage, "reference" | "verses">): Passage {
  const verses = (raw.verses ?? []).map((v) => ({
    number: v.number,
    text: sanitizePubVerseText(typeof v.text === "string" ? v.text : ""),
    crossRefs: v.crossRefs,
    footnotes: v.footnotes,
  }));
  return {
    reference: raw.reference,
    verses,
    paragraphStarts:
      raw.paragraphStarts && raw.paragraphStarts.length > 0
        ? raw.paragraphStarts
        : verses.length > 0
          ? [verses[0]!.number]
          : [],
    headings: (raw.headings ?? []).map((h) => ({
      ...h,
      text: sanitizePubVerseText(h.text),
    })),
  };
}

export interface BibleEntry {
  id: string;
  abbreviation: string;
  name: string;
  language: { id: string; name: string };
  description?: string;
}

const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function listBibles(language = "eng"): Promise<BibleEntry[]> {
  const u = new URL(`${FUNCTIONS_BASE}/bible-passage`);
  u.searchParams.set("action", "bibles");
  if (language !== "all") u.searchParams.set("language", language);
  const r = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON },
  });
  if (!r.ok) throw new Error(`bibles: ${r.status}`);
  const json = await r.json();
  const list = (json?.data ?? []) as BibleEntry[];
  if (!list.some((b) => b.id === EOTC_BIBLE_ENTRY.id)) {
    list.unshift({ ...EOTC_BIBLE_ENTRY });
  }
  return list;
}

export async function fetchPassage(
  bibleId: string,
  book: string,
  chapter: number,
  signal?: AbortSignal,
): Promise<Passage> {
  const u = new URL(`${FUNCTIONS_BASE}/bible-passage`);
  u.searchParams.set("bibleId", bibleId);
  u.searchParams.set("book", book);
  u.searchParams.set("chapter", String(chapter));
  const r = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON },
    signal,
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`passage ${r.status}: ${err}`);
  }
  const json = await r.json();
  return normalizePassage(json as Passage);
}

export interface BibleSearchHit {
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export async function searchBible(
  bibleId: string,
  query: string,
  limit = 25,
  signal?: AbortSignal,
): Promise<BibleSearchHit[]> {
  const u = new URL(`${FUNCTIONS_BASE}/bible-search`);
  u.searchParams.set("bibleId", bibleId);
  u.searchParams.set("q", query);
  u.searchParams.set("limit", String(limit));
  const r = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON },
    signal,
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`search ${r.status}: ${err}`);
  }
  const json = (await r.json()) as { results?: BibleSearchHit[] };
  return json.results ?? [];
}

export function passagePlainText(passage: Passage): string {
  return passage.verses.map((v) => `${v.number} ${v.text}`).join(" ");
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
  const ct = r.headers.get("content-type") ?? "";
  if (!r.ok) {
    let msg = `sleep-tts: ${r.status}`;
    if (ct.includes("json")) {
      try {
        const j = (await r.json()) as { error?: string };
        if (j.error) msg = j.error;
      } catch {
        /* ignore */
      }
    }
    throw new Error(msg);
  }
  if (ct.includes("json")) {
    const j = (await r.json()) as { error?: string };
    throw new Error(j.error ?? "sleep-tts returned an error");
  }
  const blob = await r.blob();
  if (blob.size < 64) throw new Error("sleep-tts returned empty audio");
  return blob;
}

/** Quick probe — verifies sleep-tts + ELEVENLABS_API_KEY on the server. */
export async function checkSleepTtsAvailable(voiceId?: string): Promise<boolean> {
  try {
    const blob = await fetchSleepAudio("Ready.", voiceId);
    return blob.size > 100;
  } catch {
    return false;
  }
}

// suppress unused import warning
void supabase;
