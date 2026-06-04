/** Strip internal citation tokens from model replies for display in claim research UI. */
export function sanitizeResearchChatContent(text: string): string {
  let out = text.trim();
  out = out.replace(/\[(?:artifact|journal|belief|entity):[0-9a-f-]{36}\]/gi, "");
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}
