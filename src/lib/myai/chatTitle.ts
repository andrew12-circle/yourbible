export const AUTO_CHAT_TITLE_MAX_WORDS = 7;

/** First N words of text; adds ellipsis when truncated. */
export function truncateToWordCount(text: string, maxWords = AUTO_CHAT_TITLE_MAX_WORDS): string {
  const words = text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/** Cap any stored sidebar title to the word budget (keeps prefixes like "Claim research:"). */
export function normalizeChatSessionTitle(title: string, maxWords = AUTO_CHAT_TITLE_MAX_WORDS): string {
  const flat = title.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  return truncateToWordCount(flat, maxWords);
}

/** Sidebar label — truncates long persisted titles for display. */
export function formatChatSessionTitle(title: string | null | undefined): string {
  const t = title?.trim();
  if (!t) return "Untitled";
  return normalizeChatSessionTitle(t);
}

/** Derive a short sidebar title from the first user message in a chat thread. */
export function chatTitleFromFirstMessage(message: string): string {
  const flat = message.replace(/\s+/g, " ").trim();
  if (!flat) return "New chat";
  const sentence = flat.split(/[.!?](?:\s|$)/)[0]?.trim() || flat;
  const title = truncateToWordCount(sentence, AUTO_CHAT_TITLE_MAX_WORDS);
  return title || "New chat";
}

/** Sidebar title when opening claim research chat (prefix + up to 5 claim words ≈ 7 total). */
export function claimResearchChatTitle(claimText: string): string {
  const snippet = truncateToWordCount(claimText.trim(), 5);
  return snippet ? `Claim research: ${snippet}` : "Claim research";
}

/** Sidebar title for hard-question research chats. */
export function hardQuestionChatTitle(question: string): string {
  const snippet = truncateToWordCount(question.trim(), 4);
  return snippet ? `Hard question — ${snippet}` : "Hard question";
}
