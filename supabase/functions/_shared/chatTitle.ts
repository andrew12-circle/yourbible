export const AUTO_CHAT_TITLE_MAX_WORDS = 5;

export function truncateToWordCount(text: string, maxWords = AUTO_CHAT_TITLE_MAX_WORDS): string {
  const words = text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/** Derive a short sidebar title from the first user message in a chat thread. */
export function titleFromFirstMessage(message: string): string {
  const flat = message.replace(/\s+/g, " ").trim();
  if (!flat) return "New chat";
  const sentence = flat.split(/[.!?](?:\s|$)/)[0]?.trim() || flat;
  const title = truncateToWordCount(sentence, AUTO_CHAT_TITLE_MAX_WORDS);
  return title || "New chat";
}

export function claimResearchTitleFromClaim(claimText: string): string {
  const snippet = truncateToWordCount(claimText.trim(), 3);
  return snippet ? `Claim research: ${snippet}` : "Claim research";
}
