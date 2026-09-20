import { fetchPassage, type Passage } from "@/lib/bible/api";
import { isBundledBibleId } from "@/lib/bible/bibleEditions";
import { getCachedPassage, setCachedPassage } from "@/lib/bible/passageCache";
import { identifyReaderPassage } from "@/lib/bible/readerPassageIdentity";

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

export async function fetchPassageWithCache(
  bibleId: string, book: string, chapter: number, signal?: AbortSignal, bibleAbbr?: string,
): Promise<Passage> {
  checkAbort(signal);
  // Delivery mode, not the CSB identifier, decides whether a shipped bundle wins.
  // In production CSB is remote and must use its bounded, provenance-separated cache.
  if (isBundledBibleId(bibleId)) {
    const passage = await fetchPassage(bibleId, book, chapter, signal, bibleAbbr);
    checkAbort(signal);
    return identifyReaderPassage(passage, bibleId, book, chapter);
  }
  const cached = await getCachedPassage(bibleId, book, chapter);
  checkAbort(signal);
  if (cached) {
    try { return identifyReaderPassage(cached.passage, bibleId, book, chapter); }
    catch { /* An invalid record is a cache miss, never Scripture for another chapter. */ }
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("This chapter is not available in a valid offline cache. Reconnect to open it.");
  }
  const passage = await fetchPassage(bibleId, book, chapter, signal, bibleAbbr);
  checkAbort(signal);
  const verified = identifyReaderPassage(passage, bibleId, book, chapter);
  await setCachedPassage(bibleId, book, chapter, verified);
  checkAbort(signal);
  return verified;
}

/** Compatibility read. Query functions, not competing hydration effects, own publication. */
export async function hydratePassageFromCache(bibleId: string, book: string, chapter: number): Promise<Passage | undefined> {
  if (isBundledBibleId(bibleId)) return undefined;
  const cached = await getCachedPassage(bibleId, book, chapter);
  if (!cached) return undefined;
  try { return identifyReaderPassage(cached.passage, bibleId, book, chapter); }
  catch { return undefined; }
}
