import {
  CHAT_EXPORT_MARKER,
  getChatJournalPreview,
  entryListPreview,
} from "@/lib/journal/chatJournalEntry";

export type EntryDisplayInput = {
  title?: string | null;
  body?: string | null;
  summary?: string | null;
  photo_url?: string | null;
  entry_kind?: string | null;
};

const SKETCH_HEADER = /^\*\*From your sketch\*\*[^\n]*\n+/im;
const CHAT_LINE = /^\*\*(You|AI)\*\*:?\s*/i;
const MARKDOWN_NOISE = /^#{1,6}\s+|^>\s+|^[-*]\s+/;

/** Pull readable prose from a journal body (typed, sketched, or chat export). */
export function extractReadableProse(
  body: string | null | undefined,
  summary?: string | null,
): string {
  const chatPreview = getChatJournalPreview(body, summary);
  if (chatPreview) return chatPreview;

  if (!body?.trim()) return summary?.trim() ?? "";

  let text = body;
  const markerIdx = text.indexOf(CHAT_EXPORT_MARKER);
  if (markerIdx >= 0) text = text.slice(0, markerIdx);

  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(SKETCH_HEADER, "");
  text = text.replace(/^---\n/gm, "\n");

  const lines = text
    .split("\n")
    .map((l) =>
      l
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(MARKDOWN_NOISE, "")
        .replace(CHAT_LINE, "")
        .trim(),
    )
    .filter((l) => l && l !== "---");

  return lines.join(" ").replace(/\s+/g, " ").trim();
}

export function entryHasReadableContent(
  body: string | null | undefined,
  summary?: string | null,
): boolean {
  return extractReadableProse(body, summary).length >= 12;
}

/** Best-effort local title before AI suggestion lands. */
export function entryFallbackTitle(
  body: string | null | undefined,
  summary?: string | null,
): string {
  const prose = extractReadableProse(body, summary);
  if (!prose) return "";
  const sentence = prose.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? prose;
  return sentence.slice(0, 80);
}

export function entryDisplayTitle(entry: EntryDisplayInput): string {
  const title = entry.title?.trim();
  if (title) return title;

  const chat = getChatJournalPreview(entry.body, entry.summary);
  if (chat) return chat.slice(0, 80);

  const fallback = entryFallbackTitle(entry.body, entry.summary);
  if (fallback) return fallback;

  if (entry.photo_url) return "Photo entry";
  if (entry.entry_kind === "chat") return "Chat session";

  return "";
}

export function isTextOnlyJournalEntry(entry: EntryDisplayInput): boolean {
  return (
    !entry.title?.trim() &&
    !entry.photo_url &&
    entryHasReadableContent(entry.body, entry.summary)
  );
}

/** Preview line under the title — skips duplicate text for untitled prose entries. */
export function entryDisplayPreview(entry: EntryDisplayInput): string {
  if (isTextOnlyJournalEntry(entry)) {
    const full = extractReadableProse(entry.body, entry.summary);
    const head = entryDisplayTitle(entry);
    const rest = full.slice(head.length).trim();
    if (rest.length >= 20) return rest.slice(0, 220);
    return "";
  }
  return entryListPreview(entry.body ?? "", entry.title ?? null, entry.summary);
}

const PLACEHOLDER_ENTRY_TITLES =
  /^(entry|untitled|new\s+(journal|entry)(?:\s+entry)?|journal\s+entry)$/i;

export function shouldSuggestJournalTitle(
  title: string | null | undefined,
  body: string | null | undefined,
  summary?: string | null,
): boolean {
  const t = title?.trim() ?? "";
  if (t && !PLACEHOLDER_ENTRY_TITLES.test(t)) return false;
  return extractReadableProse(body, summary).length >= 40;
}
