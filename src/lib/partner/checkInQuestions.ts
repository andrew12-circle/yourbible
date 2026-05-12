/** v1 conversation starters derived from partner themes (no LLM). */
export function buildCheckInQuestions(themes: string[]): string[] {
  const cleaned = themes.map((t) => t.trim()).filter(Boolean).slice(0, 6);
  const out: string[] = [];
  for (const t of cleaned.slice(0, 3)) {
    out.push(`How has “${t}” been landing for you lately — more heavy, more hopeful, or somewhere in between?`);
  }
  out.push("What felt like a small win with God this week, even if no one else noticed?");
  out.push("Is there anything you wish I understood better about your heart right now?");
  out.push("How can I love you practically in the next few days — time, touch, help, or space?");
  const uniq = [...new Set(out)];
  return uniq.slice(0, 5);
}
