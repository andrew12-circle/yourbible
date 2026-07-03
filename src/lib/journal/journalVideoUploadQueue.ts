/**
 * Retry failed journal video uploads when back online.
 * Stores metadata in localStorage; blobs in IndexedDB.
 */

const META_KEY = "yb_journal_video_upload_queue_v1";
const DB_NAME = "yb_journal_video_uploads";
const DB_STORE = "blobs";

export type QueuedJournalVideoUpload = {
  id: string;
  userId: string;
  entryId: string;
  anchorOffset: number;
  durationMs: number;
  liveTranscript: string;
  peakLiveTranscript?: string;
  /** Frozen pre-record body for transcript merge after background upload. */
  bodySnapBody?: string;
  bodySnapAnchor?: number;
  createdAt: string;
};

function readMeta(): QueuedJournalVideoUpload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedJournalVideoUpload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMeta(rows: QueuedJournalVideoUpload[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(META_KEY, JSON.stringify(rows));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueJournalVideoUpload(
  meta: QueuedJournalVideoUpload,
  video: Blob,
  audio: Blob | null,
  chapters: import("@/lib/journal/journalVideoChapters").JournalVideoChapter[] = [],
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put({ video, audio, chapters }, meta.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  const rows = readMeta().filter((r) => r.id !== meta.id);
  rows.push(meta);
  writeMeta(rows);
}

type QueuedJournalVideoPayload = {
  video: Blob;
  audio: Blob | null;
  chapters: import("@/lib/journal/journalVideoChapters").JournalVideoChapter[];
};

async function readQueuedPayload(id: string): Promise<QueuedJournalVideoPayload | null> {
  const db = await openDb();
  const payload = await new Promise<{
    video: Blob;
    audio: Blob | null;
    chapters?: import("@/lib/journal/journalVideoChapters").JournalVideoChapter[];
  } | null>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(id);
    req.onsuccess = () =>
      resolve(
        (req.result as {
          video: Blob;
          audio: Blob | null;
          chapters?: import("@/lib/journal/journalVideoChapters").JournalVideoChapter[];
        }) ?? null,
      );
    req.onerror = () => reject(req.error);
  });
  db.close();
  return payload
    ? { video: payload.video, audio: payload.audio, chapters: payload.chapters ?? [] }
    : null;
}

/** Read queued blobs without removing them (safe to retry on upload failure). */
export async function readQueuedJournalVideoUpload(id: string): Promise<QueuedJournalVideoPayload | null> {
  return readQueuedPayload(id);
}

/** Remove a successfully uploaded item from the queue. */
export async function removeQueuedJournalVideoUpload(id: string): Promise<void> {
  writeMeta(readMeta().filter((r) => r.id !== id));
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** @deprecated Prefer readQueuedJournalVideoUpload + removeQueuedJournalVideoUpload on success. */
export async function dequeueJournalVideoUpload(id: string): Promise<QueuedJournalVideoPayload | null> {
  const payload = await readQueuedPayload(id);
  if (payload) await removeQueuedJournalVideoUpload(id);
  return payload;
}

export function listQueuedJournalVideoUploads(): QueuedJournalVideoUpload[] {
  return readMeta();
}
