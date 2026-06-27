/** Shared title/summary generation for journal entries (sketch, video, dictation). */

import { callChatJson } from "./aiProvider.ts";

const VIDEO_JOURNAL_STAMP = /^Video journal\s·/i;
const PLACEHOLDER_TITLES =
  /^(entry|untitled|new\s+(journal|entry)(?:\s+entry)?|journal\s+entry|title)$/i;

export function needsAutoJournalTitle(title: string | null | undefined): boolean {
  const t = String(title ?? "").trim();
  if (!t) return true;
  if (PLACEHOLDER_TITLES.test(t)) return true;
  if (VIDEO_JOURNAL_STAMP.test(t)) return true;
  return false;
}

export function stripJournalBodyForMeta(body: string): string {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^\*\*From your sketch\*\*[^\n]*\n+/im, "")
    .replace(/^---\n/gm, "\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMetaJson(raw: string): { title: string | null; summary: string | null } {
  try {
    const parsed = JSON.parse(raw) as { title?: string | null; summary?: string | null };
    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim().slice(0, 120)
        : null;
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 900)
        : null;
    return { title, summary };
  } catch {
    return { title: null, summary: null };
  }
}

const DEFAULT_META_SYSTEM = `You help title and summarize a private faith journal entry. Reply with ONLY JSON: {"title":"..."|null,"summary":"..."|null}.
Title: 4–12 words, sentence case, no trailing period — or null if not needed.
Summary: one warm paragraph (2–4 sentences, <= 500 chars), specific to what they wrote — or null if not needed.`;

const VIDEO_META_SYSTEM = `You distill a private faith video journal transcript into a scannable summary. Reply with ONLY JSON: {"title":"..."|null,"summary":"..."|null}.
Title: 4–12 words, sentence case, no trailing period — capture the emotional or spiritual core; null if unclear.
Summary: 3–6 bullet points using "- " at the start of each line. Distill themes, feelings, decisions, and prayers — do not rewrite verbatim. Warm and specific; <= 700 chars total — or null if too thin.`;

export async function generateJournalEntryMeta(opts: {
  prose: string;
  source?: "video" | "default";
  needsTitle: boolean;
  needsSummary: boolean;
}): Promise<{ title: string | null; summary: string | null }> {
  if (!opts.needsTitle && !opts.needsSummary) {
    return { title: null, summary: null };
  }

  const sys = opts.source === "video" ? VIDEO_META_SYSTEM : DEFAULT_META_SYSTEM;
  const user = `Entry text:\n\n${opts.prose.slice(0, 12_000)}`;
  const result = await callChatJson(sys, user, 0.35, 4096);
  if (!result.ok || !result.rawText) {
    return { title: null, summary: null };
  }

  const parsed = parseMetaJson(result.rawText);
  return {
    title: opts.needsTitle ? parsed.title : null,
    summary: opts.needsSummary ? parsed.summary : null,
  };
}
