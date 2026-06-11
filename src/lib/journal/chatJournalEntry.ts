/**
 * Saved My AI / journal chat exports store a readable summary in `body` (and
 * `journal_entries.summary`) plus a machine-readable transcript after a marker.
 */

export const CHAT_EXPORT_MARKER = "<!-- chat-export:v1 -->";

export type ChatJournalMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ParsedChatJournal = {
  summary: string;
  messages: ChatJournalMessage[];
  /** `plain` = ordinary journal prose (not a chat export). */
  kind: "structured" | "legacy-finalized" | "legacy-inline" | "plain";
};

export function composeSavedChatJournalBody(
  summary: string,
  messages: ChatJournalMessage[],
): string {
  const payload = JSON.stringify({ v: 1, messages });
  if (!summary.trim()) return `${CHAT_EXPORT_MARKER}\n${payload}`;
  return `${summary}\n\n${CHAT_EXPORT_MARKER}\n${payload}`;
}

function normalizeMessages(raw: unknown): ChatJournalMessage[] {
  if (!raw || typeof raw !== "object") return [];
  const msgs = (raw as { messages?: unknown }).messages;
  if (!Array.isArray(msgs)) return [];
  return msgs
    .filter(
      (m): m is { role: string; content: string } =>
        !!m &&
        typeof m === "object" &&
        (m as { role?: string }).role !== undefined &&
        typeof (m as { content?: string }).content === "string",
    )
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content.trim(),
    }))
    .filter((m) => m.content.length > 0);
}

/** Parse markdown transcript blocks from finalize/export (`**You:** text`). */
function parseMarkdownTranscript(transcript: string): ChatJournalMessage[] {
  const out: ChatJournalMessage[] = [];
  const blocks = transcript.split(/\n{2,}/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed === "_(No messages in this session.)_") continue;
    const userM = /^\*\*You:\*\*\s*([\s\S]*)$/i.exec(trimmed);
    if (userM) {
      out.push({ role: "user", content: userM[1].trim() });
      continue;
    }
    const aiM = /^\*\*AI:\*\*\s*([\s\S]*)$/i.exec(trimmed);
    if (aiM) {
      out.push({ role: "assistant", content: aiM[1].trim() });
      continue;
    }
    const userBlock = /^\*\*You\*\*:?\s*\n+([\s\S]*)$/i.exec(trimmed);
    if (userBlock) {
      out.push({ role: "user", content: userBlock[1].trim() });
      continue;
    }
    const aiBlock = /^\*\*AI\*\*:?\s*\n+([\s\S]*)$/i.exec(trimmed);
    if (aiBlock) {
      out.push({ role: "assistant", content: aiBlock[1].trim() });
    }
  }
  return out;
}

/** Parse in-progress inline chat body (`**You**:\n\n…\n---`). */
export function parseInlineChatTranscript(body: string): ChatJournalMessage[] {
  const chunks = body.split(/\n---\n/).map((c) => c.trim()).filter(Boolean);
  const out: ChatJournalMessage[] = [];
  for (const chunk of chunks) {
    const userBlock = /^\*\*You\*\*:?\s*\n+([\s\S]*)$/i.exec(chunk);
    if (userBlock) {
      out.push({ role: "user", content: userBlock[1].trim() });
      continue;
    }
    const aiBlock = /^\*\*AI\*\*:?\s*\n+([\s\S]*)$/i.exec(chunk);
    if (aiBlock) {
      out.push({ role: "assistant", content: aiBlock[1].trim() });
    }
  }
  return out;
}

export function parseChatJournalEntry(
  body: string | null | undefined,
  dbSummary?: string | null,
): ParsedChatJournal {
  const fallbackSummary = dbSummary?.trim() ?? "";
  if (!body?.trim()) {
    return { summary: fallbackSummary, messages: [], kind: "plain" };
  }

  const markerIdx = body.indexOf(CHAT_EXPORT_MARKER);
  if (markerIdx >= 0) {
    const summary =
      body.slice(0, markerIdx).trim() || fallbackSummary;
    const jsonPart = body.slice(markerIdx + CHAT_EXPORT_MARKER.length).trim();
    try {
      const data: unknown = JSON.parse(jsonPart);
      const messages = normalizeMessages(data);
      if (messages.length > 0 || summary) {
        return { summary, messages, kind: "structured" };
      }
    } catch {
      /* fall through */
    }
  }

  const legacyFin = /^## Reflection\s*\n\n([\s\S]*?)\n\n---\n\n## Transcript\s*\n\n([\s\S]*)$/i.exec(
    body.trim(),
  );
  if (legacyFin) {
    const summary = legacyFin[1].trim() || fallbackSummary;
    const messages = parseMarkdownTranscript(legacyFin[2]);
    return { summary, messages, kind: "legacy-finalized" };
  }

  if (/\*\*You\*\*:?/i.test(body) || /\*\*AI\*\*:?/i.test(body) || /\*\*You:\*\*/i.test(body)) {
    const inline = parseInlineChatTranscript(body);
    const md = parseMarkdownTranscript(body);
    const messages = inline.length >= md.length ? inline : md;
    const summary =
      fallbackSummary ||
      messages.find((m) => m.role === "assistant")?.content.slice(0, 280).trim() ||
      "";
    if (messages.length > 0) {
      return { summary, messages, kind: "legacy-inline" };
    }
  }

  return { summary: fallbackSummary, messages: [], kind: "plain" };
}

export function isChatJournalExport(
  body: string | null | undefined,
  dbSummary?: string | null,
): boolean {
  return parseChatJournalEntry(body, dbSummary).kind !== "plain";
}

/** Sidebar / list snippet — never raw `**You**:` markdown. */
export function getChatJournalPreview(
  body: string | null | undefined,
  dbSummary?: string | null,
): string {
  const parsed = parseChatJournalEntry(body, dbSummary);
  if (parsed.summary) return parsed.summary.replace(/\s+/g, " ").slice(0, 200);
  if (parsed.messages.length > 0) {
    const pick =
      parsed.messages.find((m) => m.role === "assistant") ?? parsed.messages[0];
    return pick.content.replace(/\s+/g, " ").slice(0, 200);
  }
  return "";
}

export function entryListPreview(
  body: string,
  title: string | null,
  summary?: string | null,
): string {
  const chatSnippet = getChatJournalPreview(body, summary);
  if (chatSnippet) return chatSnippet;
  if (title) return body.replace(/\s+/g, " ").slice(0, 200);
  const lines = (body || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const readable = lines.find(
    (l) => !/^\*\*(You|AI)\*\*:?/i.test(l) && !l.startsWith("<!--") && l !== "---",
  );
  return readable?.slice(0, 200) ?? lines[0]?.slice(0, 80) ?? "";
}
