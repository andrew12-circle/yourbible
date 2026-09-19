import { JOURNAL_VIDEO_MAX_UPLOAD_BYTES } from "./journalVideoLimits";

/** Capture chunks and the complete queue Blob coexist briefly during handoff. */
export const JOURNAL_VIDEO_STORAGE_RESERVE_BYTES = 2 * JOURNAL_VIDEO_MAX_UPLOAD_BYTES + 32 * 1024 * 1024;
export type JournalVideoStorageHealth = {
  status: "ok" | "low" | "unavailable" | "unknown";
  availableBytes: number | null;
  persistent: boolean | null;
  pendingCount: number;
};

export function assessJournalVideoStorage(
  estimate: StorageEstimate | null, persistent: boolean | null, writable: boolean | null, pendingCount = 0,
): JournalVideoStorageHealth {
  const valid = Number.isFinite(estimate?.quota) && Number.isFinite(estimate?.usage);
  // Origin usage already includes pending recordings. Do not subtract them twice.
  const availableBytes = valid ? Math.max(0, estimate!.quota! - estimate!.usage!) : null;
  return {
    status: writable === false ? "unavailable" : availableBytes == null ? "unknown"
      : availableBytes < JOURNAL_VIDEO_STORAGE_RESERVE_BYTES ? "low" : "ok",
    availableBytes, persistent, pendingCount,
  };
}

/** A tiny committed write detects disabled storage before a valuable take starts. */
export function probeJournalVideoStorage(factory: IDBFactory | undefined, timeoutMs = 2000): Promise<boolean | null> {
  if (!factory) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    let db: IDBDatabase | undefined;
    const finish = (value: boolean | null) => {
      if (settled) return;
      settled = true; clearTimeout(timer); db?.close(); resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    try {
      const request = factory.open("yb_journal_video_storage_probe", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("probe");
      request.onerror = () => finish(false);
      request.onblocked = () => finish(null);
      request.onsuccess = () => {
        db = request.result;
        if (settled) { db.close(); return; }
        try {
          const transaction = db.transaction("probe", "readwrite");
          transaction.objectStore("probe").put(new Uint8Array(1024), "health");
          transaction.onabort = () => finish(false);
          transaction.onerror = () => finish(false);
          transaction.oncomplete = () => {
            // This database contains only the synthetic probe, never journal data.
            try { db!.transaction("probe", "readwrite").objectStore("probe").delete("health"); }
            catch { /* A cleanup failure does not undo the observed committed write. */ }
            finish(true);
          };
        } catch { finish(false); }
      };
    } catch { finish(false); }
  });
}

export async function inspectJournalVideoStorage(pendingCount = 0): Promise<JournalVideoStorageHealth> {
  const manager = typeof navigator === "undefined" ? undefined : navigator.storage;
  // Permission and estimate calls are optional and must not hang camera setup.
  const bounded = async <T>(work: Promise<T> | undefined): Promise<T | null> => {
    if (!work) return null;
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([work.catch(() => null), new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 2000); })]);
    } finally { clearTimeout(timer!); }
  };
  const [estimate, persistent, writable] = await Promise.all([
    bounded(Promise.resolve().then(() => manager?.estimate?.() ?? null)),
    bounded(Promise.resolve().then(() => manager?.persisted?.() ?? null)),
    probeJournalVideoStorage(typeof indexedDB === "undefined" ? undefined : indexedDB),
  ]);
  return assessJournalVideoStorage(estimate, persistent, writable, pendingCount);
}
