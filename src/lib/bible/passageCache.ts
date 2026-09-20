import { normalizePassage, type Passage } from "@/lib/bible/api";
import { PASSAGE_PARSER_REVISION } from "@/lib/bible/textRevision";
import { bibleDeliveryMode } from "@/lib/bible/bibleEditions";

const DB_NAME = "yb-passages";
const STORE = "passages";
const DB_VERSION = 1;
/** Remote Scripture must be refreshed within the provider's maximum cache window. */
export const PASSAGE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export type CachedPassageRecord = { key: string; passage: Passage; cachedAt: number };

export function passageCacheKey(bibleId: string, book: string, chapter: number): string {
  // Do not revive old parser output or development bundles in a production reader.
  return `${bibleId}|${book}|${chapter}|${PASSAGE_PARSER_REVISION}|reader-integrity-v1|${bibleDeliveryMode(bibleId)}`;
}
export function isPassageCacheFresh(cachedAt: number, now = Date.now()): boolean {
  return Number.isFinite(cachedAt) && cachedAt > 0 && cachedAt <= now && now - cachedAt < PASSAGE_CACHE_MAX_AGE_MS;
}
let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "key" });
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
      req.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
    }).catch((error) => { dbPromise = null; throw error; });
  }
  return dbPromise;
}
export async function getCachedPassage(bibleId: string, book: string, chapter: number): Promise<CachedPassageRecord | null> {
  try {
    const db = await openDb();
    const key = passageCacheKey(bibleId, book, chapter);
    const row = await new Promise<CachedPassageRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as CachedPassageRecord | undefined);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error ?? new Error("Cache read aborted"));
    });
    if (!row || row.key !== key || !isPassageCacheFresh(row.cachedAt)) return null;
    const normalized = normalizePassage(row.passage);
    return { ...row, passage: { ...row.passage, ...normalized } };
  } catch { return null; }
}
export async function setCachedPassage(bibleId: string, book: string, chapter: number, passage: Passage): Promise<void> {
  try {
    const db = await openDb();
    const record: CachedPassageRecord = { key: passageCacheKey(bibleId, book, chapter), passage, cachedAt: Date.now() };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Cache write aborted"));
    });
  } catch { /* Quota/private-mode failures cannot prevent reading a valid response. */ }
}
