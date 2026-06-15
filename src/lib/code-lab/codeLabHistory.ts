import type { CodeCardData } from "@/lib/code-lab/types";

const LS_KEY = "yb.codeLabHistory";
const MAX_ITEMS = 40;

export function readCodeLabHistory(): CodeCardData[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CodeCardData[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushCodeLabHistory(card: CodeCardData): void {
  const prev = readCodeLabHistory().filter(
    (c) =>
      !(
        c.bibleId === card.bibleId &&
        c.term === card.term &&
        c.hit.skip === card.hit.skip &&
        c.hit.startIndex === card.hit.startIndex
      ),
  );
  prev.unshift(card);
  localStorage.setItem(LS_KEY, JSON.stringify(prev.slice(0, MAX_ITEMS)));
}
