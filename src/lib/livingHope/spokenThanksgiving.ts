/** Local organization only: keep the speaker's words, never invent gratitude. */
export function splitSpokenThanksgiving(text: string): string[] {
  return text
    .replace(/\bnext\s+(?:item|one|thank(?:s|sgiving)?)\b[,.!:;]?/gi, "\n")
    .replace(/\bnumber\s+(?:one|two|three|four|five|[1-5])\b[,.!:;]?/gi, "\n")
    .replace(/(?:^|\n)\s*[1-5][.)]\s*/g, "\n")
    .replace(/\s+(?=(?:I(?:'m| am)\s+(?:also\s+)?(?:thankful|grateful)\s+for|thank\s+you\s+for)\b)/gi, "\n")
    .split(/\n+/)
    .map((item) => item.trim().replace(/^[,.;:\s]+|[,;:\s]+$/g, ""))
    .filter(Boolean);
}

export function placeSpokenThanksgiving(values: string[], transcript: string, count = 5): { values: string[]; remaining: string; placed: number } {
  const items = splitSpokenThanksgiving(transcript);
  const next = Array.from({ length: count }, (_, i) => values[i] ?? "");
  let cursor = 0;
  for (let i = 0; i < next.length && cursor < items.length; i++) {
    if (!next[i].trim()) next[i] = items[cursor++];
  }
  return { values: next, remaining: items.slice(cursor).join("\n"), placed: cursor };
}
