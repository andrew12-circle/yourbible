import type { JournalVideoChapter } from "@/lib/journal/journalVideoChapters";

const META_KEY = "yb_journal_video_recording_recovery_v1";
const DB_NAME = "yb_journal_video_recording_recovery";
const DB_STORE = "chunks";
const DB_VERSION = 1;

export type JournalVideoRecordingRecoveryMeta = {
  id: string;
  userId: string;
  entryId: string;
  anchorOffset: number;
  durationMs: number;
  liveTranscript: string;
  peakLiveTranscript: string;
  videoMimeType: string;
  audioMimeType: string | null;
  videoChunkCount: number;
  audioChunkCount: number;
  chapters: JournalVideoChapter[];
  startedAt: string;
  updatedAt: string;
};

export type JournalVideoRecordingRecoveryPayload = {
  meta: JournalVideoRecordingRecoveryMeta;
  video: Blob;
  audio: Blob | null;
};

type StoredChunk = {
  key: string;
  recordingId: string;
  kind: "video" | "audio";
  index: number;
  blob: Blob;
};

function nowIso(): string {
  return new Date().toISOString();
}

function readMetas(): JournalVideoRecordingRecoveryMeta[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as JournalVideoRecordingRecoveryMeta[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMetas(rows: JournalVideoRecordingRecoveryMeta[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(META_KEY, JSON.stringify(rows));
}

function upsertMeta(
  id: string,
  patch: Partial<JournalVideoRecordingRecoveryMeta>,
): JournalVideoRecordingRecoveryMeta | null {
  const rows = readMetas();
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return null;
  const next = { ...rows[index], ...patch, updatedAt: nowIso() };
  rows[index] = next;
  writeMetas(rows);
  return next;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const store = db.objectStoreNames.contains(DB_STORE)
        ? req.transaction?.objectStore(DB_STORE)
        : db.createObjectStore(DB_STORE, { keyPath: "key" });
      if (store && !store.indexNames.contains("recordingId")) {
        store.createIndex("recordingId", "recordingId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function chunkKey(recordingId: string, kind: "video" | "audio", index: number): string {
  return `${recordingId}:${kind}:${String(index).padStart(6, "0")}`;
}

export function startInProgressJournalVideoRecording(
  meta: Omit<
    JournalVideoRecordingRecoveryMeta,
    "startedAt" | "updatedAt" | "videoChunkCount" | "audioChunkCount"
  >,
): JournalVideoRecordingRecoveryMeta {
  const timestamp = nowIso();
  const next: JournalVideoRecordingRecoveryMeta = {
    ...meta,
    videoChunkCount: 0,
    audioChunkCount: 0,
    startedAt: timestamp,
    updatedAt: timestamp,
  };
  const rows = readMetas().filter((row) => row.id !== next.id);
  rows.push(next);
  writeMetas(rows);
  return next;
}

export function updateInProgressJournalVideoRecording(
  id: string | null | undefined,
  patch: Partial<JournalVideoRecordingRecoveryMeta>,
): void {
  if (!id) return;
  upsertMeta(id, patch);
}

export async function appendInProgressJournalVideoRecordingChunk(
  id: string | null | undefined,
  kind: "video" | "audio",
  index: number,
  blob: Blob,
): Promise<void> {
  if (!id || blob.size <= 0) return;
  const countPatch =
    kind === "video"
      ? { videoChunkCount: index + 1 }
      : { audioChunkCount: index + 1 };
  const meta = readMetas().find((row) => row.id === id);
  if (meta) {
    upsertMeta(id, {
      ...countPatch,
      videoChunkCount:
        kind === "video" ? Math.max(meta.videoChunkCount, index + 1) : meta.videoChunkCount,
      audioChunkCount:
        kind === "audio" ? Math.max(meta.audioChunkCount, index + 1) : meta.audioChunkCount,
    });
  }

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    store.put({
      key: chunkKey(id, kind, index),
      recordingId: id,
      kind,
      index,
      blob,
    } satisfies StoredChunk);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function listInProgressJournalVideoRecordings(): JournalVideoRecordingRecoveryMeta[] {
  return readMetas().sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export async function readInProgressJournalVideoRecording(
  id: string,
): Promise<JournalVideoRecordingRecoveryPayload | null> {
  const meta = readMetas().find((row) => row.id === id);
  if (!meta) return null;
  const db = await openDb();
  const chunks = await new Promise<StoredChunk[]>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const index = tx.objectStore(DB_STORE).index("recordingId");
    const req = index.getAll(id);
    req.onsuccess = () => resolve((req.result as StoredChunk[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();

  const videoChunks = chunks
    .filter((chunk) => chunk.kind === "video")
    .sort((a, b) => a.index - b.index)
    .map((chunk) => chunk.blob);
  if (!videoChunks.length) return { meta, video: new Blob([], { type: meta.videoMimeType }), audio: null };

  const audioChunks = chunks
    .filter((chunk) => chunk.kind === "audio")
    .sort((a, b) => a.index - b.index)
    .map((chunk) => chunk.blob);

  return {
    meta,
    video: new Blob(videoChunks, { type: meta.videoMimeType }),
    audio: audioChunks.length ? new Blob(audioChunks, { type: meta.audioMimeType ?? undefined }) : null,
  };
}

export async function clearInProgressJournalVideoRecording(
  id: string | null | undefined,
): Promise<void> {
  if (!id) return;
  writeMetas(readMetas().filter((row) => row.id !== id));
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    const index = tx.objectStore(DB_STORE).index("recordingId");
    const req = index.openCursor(IDBKeyRange.only(id));
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
