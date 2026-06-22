const DB_NAME = "yb_journal_lock_v1";
const DB_VERSION = 1;
const STORE = "device_locks";

export type DeviceLockRecord = {
  userId: string;
  pinSalt: string;
  pinWrappedDek: string;
  bioCredentialId?: string;
  bioWrappedDek?: string;
  bioLocalSecret?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "userId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function getDeviceLockRecord(userId: string): Promise<DeviceLockRecord | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(userId);
    req.onsuccess = () => resolve((req.result as DeviceLockRecord | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    tx.oncomplete = () => db.close();
  });
}

export async function saveDeviceLockRecord(record: DeviceLockRecord): Promise<void> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB unavailable");
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
}

export async function clearDeviceLockRecord(userId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(userId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
  });
}

export function hasPinLock(record: DeviceLockRecord | null): boolean {
  return !!(record?.pinSalt && record?.pinWrappedDek);
}

export function hasBiometricLock(record: DeviceLockRecord | null): boolean {
  return !!(record?.bioCredentialId && record?.bioWrappedDek && record?.bioLocalSecret);
}
