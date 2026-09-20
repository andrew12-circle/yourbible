import type { Passage } from "@/lib/bible/api";
import { BOOKS } from "@/data/books";

export interface ReaderPassageIdentity { bibleId: string; bookAbbr: string; chapter: number }
export type IdentifiedPassage = Passage & { readerIdentity: ReaderPassageIdentity };
const normalizedName = (name: string) => name.toLowerCase().replace(/[.\s]+/g, "");
const aliases: Record<string, string> = { songofsongs: "Sng", songofsolomon: "Sng", psalm: "Psa" };
function exactReference(reference: string): { bookAbbr: string; chapter: number } | null {
  const match = /^(.*?)\s+(\d+)(?:\s*:\s*\d+(?:\s*[-–—]\s*\d+)?)?$/.exec(reference.trim());
  if (!match) return null;
  const name = normalizedName(match[1]);
  const book = BOOKS.find((candidate) => normalizedName(candidate.name) === name || normalizedName(candidate.abbr) === name);
  const bookAbbr = book?.abbr ?? aliases[name];
  return bookAbbr ? { bookAbbr, chapter: Number(match[2]) } : null;
}
/** Use exact source identity, never a fuzzy search result, to authorize displayed Scripture. */
export function identifyReaderPassage(passage: Passage, bibleId: string, bookAbbr: string, chapter: number): IdentifiedPassage {
  if (!passage || !Array.isArray(passage.verses) || passage.verses.length === 0) throw new Error("The requested chapter did not contain readable Scripture.");
  const identity = (passage as Partial<IdentifiedPassage>).readerIdentity;
  if (identity && (identity.bibleId !== bibleId || identity.bookAbbr !== bookAbbr || identity.chapter !== chapter)) throw new Error("The returned Scripture belongs to a different chapter or edition.");
  const reference = exactReference(passage.reference ?? "");
  if (reference && (reference.bookAbbr !== bookAbbr || reference.chapter !== chapter)) throw new Error("The returned Scripture reference does not match the requested chapter.");
  // Ethiopian references are localized. Their request and cache scope remain bound.
  if (!reference && bibleId !== "eotc-am-81") throw new Error("The returned Scripture reference could not be verified.");
  let previous = 0;
  for (const verse of passage.verses) {
    if (!Number.isInteger(verse.number) || verse.number <= previous || typeof verse.text !== "string") throw new Error("The requested chapter has invalid or out-of-order verse data.");
    previous = verse.number;
  }
  return identity ? passage as IdentifiedPassage : { ...passage, readerIdentity: { bibleId, bookAbbr, chapter } };
}
