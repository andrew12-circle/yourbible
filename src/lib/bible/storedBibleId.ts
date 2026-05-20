export const LS_BIBLE_KEY = "yb.bibleId";

export function getStoredBibleId(): string | null {
  try {
    return localStorage.getItem(LS_BIBLE_KEY);
  } catch {
    return null;
  }
}
