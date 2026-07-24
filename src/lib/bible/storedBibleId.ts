import { API_BIBLE_CSB_ID } from "@/lib/bible/bibleEditions";

export const LS_BIBLE_KEY = "yb.bibleId";
export const LS_BIBLE_ABBR_KEY = "yb.bibleAbbr";

export function getStoredBibleId(): string | null {
  try {
    return localStorage.getItem(LS_BIBLE_KEY);
  } catch {
    return null;
  }
}

export function getStoredBibleAbbr(): string | null {
  try {
    return localStorage.getItem(LS_BIBLE_ABBR_KEY);
  } catch {
    return null;
  }
}

export function getStoredBibleIdOrDefault(): string {
  return getStoredBibleId() ?? API_BIBLE_CSB_ID;
}

export function persistBibleSelection(id: string, abbreviation?: string): void {
  try {
    localStorage.setItem(LS_BIBLE_KEY, id);
    if (abbreviation) localStorage.setItem(LS_BIBLE_ABBR_KEY, abbreviation);
  } catch {
    /* private mode */
  }
}
