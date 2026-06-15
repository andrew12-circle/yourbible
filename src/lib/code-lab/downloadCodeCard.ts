import type { CodeCardData } from "@/lib/code-lab/types";

export function downloadCodeCard(card: CodeCardData): void {
  const blob = new Blob([JSON.stringify(card, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `code-lab-${card.bibleId}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
