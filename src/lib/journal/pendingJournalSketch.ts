import type { JournalEntryKind } from "@/lib/journal/entryKinds";

const DB_NAME = "yb-journal-pending-sketches";
const STORE = "sketches";
const DB_VERSION = 1;
const FALLBACK_PREFIX = "yb_journal_pending_sketch_v1_";

type PendingSketchRecord = {
  key: string;
  fileName: string;
  type: string;
  blob: Blob;
  updatedAt: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function pendingJournalSketchKey(
  userId: string | undefined,
  editId: string | undefined,
  entryKind?: JournalEntryKind | null,
) {
  const owner = userId ?? "anonymous";
  const scope = editId ?? `new:${entryKind ?? "plain"}`;
  return `${owner}:${scope}`;
}

function fallbackKey(key: string) {
  return `${FALLBACK_PREFIX}${key}`;
}

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

async function putIndexedDb(record: PendingSketchRecord): Promise<boolean> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  }
}

async function getIndexedDb(key: string): Promise<PendingSketchRecord | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as PendingSketchRecord | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function deleteIndexedDb(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* IndexedDB unavailable */
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function saveFallback(key: string, file: File) {
  if (typeof localStorage === "undefined") return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    localStorage.setItem(
      fallbackKey(key),
      JSON.stringify({
        fileName: file.name,
        type: file.type || "image/png",
        base64: bytesToBase64(bytes),
        updatedAt: Date.now(),
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

function loadFallback(key: string): File | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(fallbackKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      fileName?: unknown;
      type?: unknown;
      base64?: unknown;
    };
    if (typeof parsed.fileName !== "string" || typeof parsed.base64 !== "string") return null;
    const type = typeof parsed.type === "string" ? parsed.type : "image/png";
    return new File([base64ToBytes(parsed.base64)], parsed.fileName, { type });
  } catch {
    return null;
  }
}

function clearFallback(key: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(fallbackKey(key));
  } catch {
    /* ignore */
  }
}

export async function savePendingJournalSketch(key: string, file: File): Promise<void> {
  const stored = await putIndexedDb({
    key,
    fileName: file.name,
    type: file.type || "image/png",
    blob: file,
    updatedAt: Date.now(),
  });
  if (!stored) await saveFallback(key, file);
}

export async function loadPendingJournalSketch(key: string): Promise<File | null> {
  const record = await getIndexedDb(key);
  if (record) {
    return new File([record.blob], record.fileName, { type: record.type || "image/png" });
  }
  return loadFallback(key);
}

export async function clearPendingJournalSketch(key: string): Promise<void> {
  await deleteIndexedDb(key);
  clearFallback(key);
}
