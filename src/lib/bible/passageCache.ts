import { normalizePassage, type Passage } from "@/lib/bible/api";

const DB_NAME = "yb-passages";
const STORE = "passages";
const DB_VERSION = 1;

export type CachedPassageRecord = {
  key: string;
  passage: Passage;
  cachedAt: number;
};

/** Bump when passage payload shape changes (e.g. paragraph metadata, marker cleanup). */
const PASSAGE_CACHE_VERSION = 4;

export function passageCacheKey(bibleId: string, book: string, chapter: number): string {
  return `${bibleId}|${book}|${chapter}|v${PASSAGE_CACHE_VERSION}`;
}

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
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    });
  }
  return dbPromise;
}

export async function getCachedPassage(
  bibleId: string,
  book: string,
  chapter: number,
): Promise<CachedPassageRecord | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.get(passageCacheKey(bibleId, book, chapter));
      req.onsuccess = () => {
        const row = req.result as CachedPassageRecord | undefined;
        resolve(row ? { ...row, passage: normalizePassage(row.passage) } : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setCachedPassage(
  bibleId: string,
  book: string,
  chapter: number,
  passage: Passage,
): Promise<void> {
  try {
    const db = await openDb();
    const record: CachedPassageRecord = {
      key: passageCacheKey(bibleId, book, chapter),
      passage,
      cachedAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* quota or private mode */
  }
}
