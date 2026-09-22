import { mergeJournalText } from "@/lib/journal/journalTextMerge";
import { replaceMorningSection } from "./morningFormulaJournalBody";

export function readMorningSection(body: string, heading: string): string {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => line.trimEnd() === heading);
  if (start < 0) return "";
  let end = start + 1;
  while (end < lines.length && !/^##\s/.test(lines[end]) && !lines[end].startsWith("<!-- morning-formula-review:start")) end++;
  return lines.slice(start + 1, end).join("\n").trim();
}

/** A delayed text save must not erase a transcript inserted after editing started. */
export function mergeMorningSectionEdit(body: string, heading: string, base: string, edited: string) {
  const merged = mergeJournalText(base, edited.trim(), readMorningSection(body, heading));
  if (merged === null) throw new Error("This section changed elsewhere. Your writing is kept on this device. Open the full journal to reconcile it before continuing.");
  return { body: replaceMorningSection(body, heading, merged), text: merged };
}
