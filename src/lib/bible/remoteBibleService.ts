import { isBundledBibleId } from "@/lib/bible/bibleEditions";

/**
 * Some older server-side tools obtain Scripture through API.Bible. They must
 * not receive the edition shipped with the reader: its text is authoritative
 * only from the local bundle and a remote fallback would spend credits.
 */
export const BUNDLED_BIBLE_REMOTE_SERVICE_ERROR =
  "This feature is not available for the bundled CSB because it would require API.Bible. API.Bible was not used.";

export function usesBundledBible(bibleId: string | null | undefined): boolean {
  return isBundledBibleId(bibleId);
}

export function assertRemoteBibleServiceAllowed(bibleId: string | null | undefined): void {
  if (usesBundledBible(bibleId)) {
    throw new Error(BUNDLED_BIBLE_REMOTE_SERVICE_ERROR);
  }
}
