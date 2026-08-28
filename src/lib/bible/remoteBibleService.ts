import { API_BIBLE_CSB_ID } from "@/lib/bible/bibleEditions";

/**
 * Some older server-side tools reject the reader's stable CSB identifier.
 * Keep that policy tied to edition identity even when production chapter
 * delivery moves from a local bundle to the dedicated passage function.
 */
export const BUNDLED_BIBLE_REMOTE_SERVICE_ERROR =
  "This feature is not available for CSB through this service. API.Bible was not used.";

export function usesBundledBible(bibleId: string | null | undefined): boolean {
  return bibleId === API_BIBLE_CSB_ID;
}

export function assertRemoteBibleServiceAllowed(bibleId: string | null | undefined): void {
  if (usesBundledBible(bibleId)) {
    throw new Error(BUNDLED_BIBLE_REMOTE_SERVICE_ERROR);
  }
}
