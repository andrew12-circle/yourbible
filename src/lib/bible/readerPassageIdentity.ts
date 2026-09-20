import type { Passage } from "@/lib/bible/api";
import { parseBibleReference } from "@/lib/bible/parseBibleReference";

export interface ReaderPassageIdentity {
  bibleId: string;
  bookAbbr: string;
  chapter: number;
}
export type IdentifiedPassage = Passage & { readerIdentity: ReaderPassageIdentity };

/** Validate before assigning a response or cache record to a chapter's query. */
export function identifyReaderPassage(
  passage: Passage,
  bibleId: string,
  bookAbbr: string,
  chapter: number,
): IdentifiedPassage {
  if (!passage || !Array.isArray(passage.verses) || passage.verses.length === 0) {
    throw new Error("The requested chapter did not contain readable Scripture.");
  }
  const identity = (passage as Partial<IdentifiedPassage>).readerIdentity;
  if (identity && (identity.bibleId !== bibleId || identity.bookAbbr !== bookAbbr || identity.chapter !== chapter)) {
    throw new Error("The returned Scripture belongs to a different chapter or edition.");
  }
  const reference = parseBibleReference(passage.reference ?? "");
  if (reference && (reference.bookAbbr !== bookAbbr || reference.chapter !== chapter)) {
    throw new Error("The returned Scripture reference does not match the requested chapter.");
  }
  // The Ethiopian reader uses localized references outside the English parser.
  if (!reference && bibleId !== "eotc-am-81") {
    throw new Error("The returned Scripture reference could not be verified.");
  }
  let previous = 0;
  for (const verse of passage.verses) {
    if (!Number.isInteger(verse.number) || verse.number <= previous || typeof verse.text !== "string") {
      throw new Error("The requested chapter has invalid or out-of-order verse data.");
    }
    previous = verse.number;
  }
  if (identity) return passage as IdentifiedPassage;
  return { ...passage, readerIdentity: { bibleId, bookAbbr, chapter } };
}
