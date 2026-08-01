import { EOTC_BIBLE_ENTRY, WLC_BIBLE_ENTRY, isEotcBibleId } from "@/lib/bible/canon";
import { BUNDLED_BIBLE_ENTRIES } from "@/lib/bible/bibleEditions";
import { loadCanonicalBundleFromUrl } from "@/lib/bible/canonical/bundleLoader";
import {
  CANONICAL_CSB_BIBLE_ID,
  canonicalChapterToPassage,
  isCanonicalCsbBible,
} from "@/lib/bible/canonical/passageToCanonical";
import { parseChapterText, parsePassageHtml, sanitizePubVerseText } from "@/lib/bible/parsePassageHtml";
import { collectCrossRefs, collectFootnotes, versePlainText } from "@/lib/bible/verseParts";
import { edgeFunctionAuthHeaders } from "@/lib/auth/functionAuth";

export { EOTC_BIBLE_ID, isEotcBibleId } from "@/lib/bible/canon";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export type VersePartStyle = "divine" | "inscription" | "selah";

export type VersePart =
  | { kind: "text"; text: string; style?: VersePartStyle }
  | { kind: "footnote"; marker: number; text: string }
  | { kind: "image"; src: string; alt: string; caption?: string }
  | {
      kind: "crossref";
      label: string;
      book: string;
      chapter: number;
      verse: number;
      /** Publisher xo letter (a, b, c…) when present; otherwise assigned at render time. */
      letter?: string;
    };

export interface PassageVerse {
  number: number;
  text: string;
  parts?: VersePart[];
  crossRefs?: PassageCrossRef[];
  footnotes?: PassageFootnote[];
}
export interface PassageCrossRef { label: string; book: string; chapter: number; verse: number; }
export interface PassageFootnote { marker: number; text: string; }
export interface PassageHeading { beforeVerse: number; text: string; }
export interface PoetryBlock { beforeVerse: number; level: number; }
export interface Passage {
  reference: string;
  verses: PassageVerse[];
  paragraphStarts: number[];
  headings: PassageHeading[];
  poetryBlocks?: PoetryBlock[];
  textRevision?: string;
}

/** Ensure every verse has a string body (cached/API payloads can omit text). */
export function normalizePassage(raw: Partial<Passage> & Pick<Passage, "reference" | "verses">): Passage {
  const verses = (raw.verses ?? []).map((v) => {
    const parts = v.parts;
    const text = sanitizePubVerseText(
      parts && parts.length > 0
        ? versePlainText({ number: v.number, text: "", parts })
        : typeof v.text === "string"
          ? v.text
          : "",
    );
    return {
      number: v.number,
      text,
      parts,
      crossRefs: v.crossRefs ?? (parts ? collectCrossRefs(parts) : undefined),
      footnotes: v.footnotes ?? (parts ? collectFootnotes(parts) : undefined),
    };
  });
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
    poetryBlocks: raw.poetryBlocks ?? [],
    textRevision: raw.textRevision,
  };
}

/** Prefer client-side HTML parsing so parser fixes apply without redeploying edge functions. */
export function resolvePassageFromApi(json: unknown): Passage {
  if (!json || typeof json !== "object") {
    throw new Error("Invalid passage response");
  }

  const row = json as Record<string, unknown>;
  const reference = typeof row.reference === "string" ? row.reference : "";
  const textRevision = typeof row.textRevision === "string" ? row.textRevision : undefined;
  const rawContent = row.rawContent;

  if (typeof rawContent === "string" && rawContent.trim()) {
    let parsed = parsePassageHtml(rawContent, reference);
    if (parsed.verses.length === 0) {
      const verses = parseChapterText(rawContent);
      parsed = {
        reference,
        verses,
        paragraphStarts: verses.length > 0 ? [verses[0]!.number] : [],
        headings: [],
        poetryBlocks: [],
      };
    }
    return normalizePassage({ ...parsed, textRevision });
  }

  return normalizePassage(json as Passage);
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
  const bundled = BUNDLED_BIBLE_ENTRIES.filter(
    (edition) => language === "all" || edition.language.id === language,
  );

  // Reader-facing edition selection must not spend an API.Bible request merely
  // to populate a dropdown. Keep the two locally supported special editions
  // visible where their respective canon/tools need them.
  const entries: BibleEntry[] = [{ ...EOTC_BIBLE_ENTRY }, ...bundled];
  if (language === "all") entries.splice(1, 0, { ...WLC_BIBLE_ENTRY });
  return entries;
}

export async function fetchPassage(
  bibleId: string,
  book: string,
  chapter: number,
  signal?: AbortSignal,
  bibleAbbr?: string,
): Promise<Passage> {
  if (isCanonicalCsbBible(bibleId)) {
    const bundled = await loadCanonicalBundleFromUrl(
      book,
      chapter,
      CANONICAL_CSB_BIBLE_ID,
    );
    if (bundled) return canonicalChapterToPassage(bundled);
    throw new Error(
      `Bundled CSB chapter unavailable: ${book} ${chapter}. API.Bible was not used.`,
    );
  }

  if (!isEotcBibleId(bibleId)) {
    throw new Error("This translation is not bundled locally. API.Bible was not used.");
  }

  const u = new URL(`${FUNCTIONS_BASE}/bible-passage`);
  u.searchParams.set("bibleId", bibleId);
  u.searchParams.set("book", book);
  u.searchParams.set("chapter", String(chapter));
  if (bibleAbbr) u.searchParams.set("bibleAbbr", bibleAbbr);
  const r = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON },
    signal,
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`passage ${r.status}: ${err}`);
  }
  const json = await r.json();
  return resolvePassageFromApi(json);
}

export interface BibleSearchHit {
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BookIntroduction {
  title: string;
  html: string;
}

export async function fetchBookIntroduction(
  bibleId: string,
  book: string,
  signal?: AbortSignal,
): Promise<BookIntroduction | null> {
  // The local reader supplies its own concise book introductions. Do not make
  // an API.Bible book-intro probe for an edition that is not bundled.
  void bibleId;
  void book;
  void signal;
  return null;
}

export async function searchBible(
  bibleId: string,
  query: string,
  limit = 25,
  signal?: AbortSignal,
): Promise<BibleSearchHit[]> {
  // The only shipped full-text index is CSB. Keep this exact rather than
  // treating a future bundled edition as CSB and returning the wrong text.
  if (isCanonicalCsbBible(bibleId)) {
    const { searchBundledCsbVerses } = await import("@/lib/bible/canonical/bundledVerseSearch");
    return searchBundledCsbVerses(query, limit, signal);
  }

  throw new Error("Full-text search is available only for the bundled CSB edition. API.Bible was not used.");
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
  let headers: Record<string, string>;
  try {
    headers = {
      "Content-Type": "application/json",
      ...(await edgeFunctionAuthHeaders()),
    };
  } catch {
    onError?.("Sign in required");
    return;
  }
  const resp = await fetch(`${FUNCTIONS_BASE}/verse-ai`, {
    method: "POST",
    headers,
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
  const headers = {
    "Content-Type": "application/json",
    ...(await edgeFunctionAuthHeaders()),
  };
  const r = await fetch(`${FUNCTIONS_BASE}/sleep-tts`, {
    method: "POST",
    headers,
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
