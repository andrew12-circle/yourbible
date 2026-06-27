import type { CanonicalChapterRecord } from "./types";
import { chapterCacheKey } from "./verseId";

const DB_NAME = "yb-csb-verses";
const CHAPTER_STORE = "chapters";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CHAPTER_STORE)) {
          const store = db.createObjectStore(CHAPTER_STORE, { keyPath: "key" });
          store.createIndex("by_chapter", ["bibleId", "bookAbbr", "chapter"], { unique: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    });
  }
  return dbPromise;
}

export async function getCanonicalChapter(
  bibleId: string,
  bookAbbr: string,
  chapter: number,
): Promise<CanonicalChapterRecord | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CHAPTER_STORE, "readonly");
      const req = tx.objectStore(CHAPTER_STORE).get(chapterCacheKey(bibleId, bookAbbr, chapter));
      req.onsuccess = () => resolve((req.result as CanonicalChapterRecord | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setCanonicalChapter(record: CanonicalChapterRecord): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CHAPTER_STORE, "readwrite");
      tx.objectStore(CHAPTER_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* quota or private mode */
  }
}

export async function hasCanonicalChapter(
  bibleId: string,
  bookAbbr: string,
  chapter: number,
): Promise<boolean> {
  const row = await getCanonicalChapter(bibleId, bookAbbr, chapter);
  return row != null && row.verses.length > 0;
}

export async function countCanonicalChapters(bibleId: string): Promise<number> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CHAPTER_STORE, "readonly");
      const req = tx.objectStore(CHAPTER_STORE).index("by_chapter").openCursor(
        IDBKeyRange.bound([bibleId, "", 0], [bibleId, "\uffff", 9999]),
      );
      let count = 0;
      req.onsuccess = () => {
        if (req.result) {
          count += 1;
          req.result.continue();
        } else {
          resolve(count);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

export async function listCanonicalChapterKeys(bibleId: string): Promise<string[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CHAPTER_STORE, "readonly");
      const req = tx.objectStore(CHAPTER_STORE).getAllKeys();
      req.onsuccess = () => {
        const keys = (req.result as string[]).filter((k) => k.startsWith(`${bibleId}|`));
        resolve(keys);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}
