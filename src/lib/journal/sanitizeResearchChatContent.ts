/** Strip internal citation tokens from model replies for display in chat UI. */
export function sanitizeResearchChatContent(text: string): string {
  let out = text.trim();
  out = out.replace(/\[+?(?:artifact|journal|belief|entity|influence|tension):[^\]]+\]+/gi, "");
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}
