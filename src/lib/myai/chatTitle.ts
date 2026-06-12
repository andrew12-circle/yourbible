/** Derive a short sidebar title from the first user message in a chat thread. */
export function chatTitleFromFirstMessage(message: string): string {
  const flat = message.replace(/\s+/g, " ").trim();
  if (!flat) return "New chat";
  const sentence = flat.split(/[.!?](?:\s|$)/)[0]?.trim() || flat;
  const base = sentence.length > 56 ? `${sentence.slice(0, 53).trim()}…` : sentence;
  return base || "New chat";
}
