import type { JournalVideoChapter } from "@/lib/journal/journalVideoChapters";

export const JOURNAL_VIDEO_RECOVERY_META_KEY = "yb_journal_video_recording_recovery_v1";
const DB_NAME = "yb_journal_video_recording_recovery";
const DB_STORE = "chunks";
const DB_VERSION = 1;

export const JOURNAL_VIDEO_RECOVERY_CHANGED_EVENT = "yourbible:journal-video-recovery-changed";
export const JOURNAL_VIDEO_RECOVERY_STALE_MS = 15_000;
const JOURNAL_VIDEO_FINALIZED_RECOVERY_STALE_MS = 5 * 60_000;
const JOURNAL_VIDEO_ACTIVE_HEARTBEAT_MS = 5_000;
const activeRecoveryIdsInThisPage = new Set<string>();
const recoveryLockReleases = new Map<string, () => void>();
const recoveryHeartbeatTimers = new Map<string, number>();

function journalVideoWebLocksAvailable(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.locks?.request === "function";
}

export type JournalVideoRecoveryStatus =
  | "recording"
  | "paused"
  | "finalizing"
  | "ready"
  | "failed";

export type JournalVideoRecoveryInterruptionReason =
  | "manual"
  | "silence"
  | "background"
  | "track-ended"
  | "recorder-stopped"
  | "unmounted"
  | "unknown";

export type JournalVideoRecordingRecoveryMeta = {
  id: string;
  userId: string;
  entryId: string;
  anchorOffset: number;
  durationMs: number;
  liveTranscript: string;
  peakLiveTranscript: string;
  bodySnapBody?: string;
  bodySnapAnchor?: number;
  videoMimeType: string;
  audioMimeType: string | null;
  videoChunkCount: number;
  audioChunkCount: number;
  chapters: JournalVideoChapter[];
  startedAt: string;
  updatedAt: string;
  /** Explicit lifecycle and lease fields. Older v1 rows omit these and remain readable. */
  status?: JournalVideoRecoveryStatus;
  ownerId?: string;
  heartbeatAt?: string;
  /** Set only when the owning capture/review page deliberately releases this draft. */
  ownershipReleasedAt?: string;
  finalizedAt?: string;
  interruptionReason?: JournalVideoRecoveryInterruptionReason;
  videoBytes?: number;
  audioBytes?: number;
  persistenceError?: string;
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

function notifyRecoveryChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(JOURNAL_VIDEO_RECOVERY_CHANGED_EVENT));
}

function recoveryLockName(id: string): string {
  return `yourbible-journal-video-recovery:${id}`;
}

function holdJournalVideoRecoveryLock(id: string): void {
  if (!journalVideoWebLocksAvailable() || recoveryLockReleases.has(id)) return;
  let releaseLock = () => undefined;
  const released = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  recoveryLockReleases.set(id, () => {
    recoveryLockReleases.delete(id);
    releaseLock();
  });
  try {
    void navigator.locks
      .request(recoveryLockName(id), { mode: "exclusive" }, async () => released)
      .catch(() => recoveryLockReleases.delete(id));
  } catch {
    recoveryLockReleases.delete(id);
  }
}

function releaseJournalVideoRecoveryLock(id: string): void {
  recoveryLockReleases.get(id)?.();
}

export type JournalVideoRecoveryClaimLockResult<T> =
  | { claimed: false }
  | { claimed: true; value: T };

/**
 * Serialize recovery across same-origin tabs and avoid claiming a recorder held
 * by a live (possibly frozen) tab. Browsers without Web Locks retain the lease
 * heartbeat fallback.
 */
export async function withJournalVideoRecoveryClaimLock<T>(
  id: string,
  work: () => Promise<T>,
): Promise<JournalVideoRecoveryClaimLockResult<T>> {
  if (!journalVideoWebLocksAvailable()) {
    return { claimed: true, value: await work() };
  }
  let callbackStarted = false;
  try {
    return await navigator.locks.request(
      recoveryLockName(id),
      { mode: "exclusive", ifAvailable: true },
      async (lock): Promise<JournalVideoRecoveryClaimLockResult<T>> => {
        if (!lock) return { claimed: false };
        callbackStarted = true;
        return { claimed: true, value: await work() };
      },
    );
  } catch (error) {
    if (callbackStarted) throw error;
    // A browser that advertises Web Locks but rejects the request is not a
    // safe signal that no live tab owns this recording. Defer instead of
    // falling through to destructive recovery without coordination.
    return { claimed: false };
  }
}

function readMetas(strict = false): JournalVideoRecordingRecoveryMeta[] {
  if (typeof localStorage === "undefined") {
    if (strict) throw new Error("Journal video recovery requires browser storage.");
    return [];
  }
  try {
    const raw = localStorage.getItem(JOURNAL_VIDEO_RECOVERY_META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as JournalVideoRecordingRecoveryMeta[];
    if (Array.isArray(parsed)) return parsed;
    if (strict) throw new Error("The recovery index is not a list.");
    return [];
  } catch (error) {
    if (strict) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not read the journal video recovery index: ${message}`);
    }
    return [];
  }
}

function writeMetas(rows: JournalVideoRecordingRecoveryMeta[]): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(JOURNAL_VIDEO_RECOVERY_META_KEY, JSON.stringify(rows));
    notifyRecoveryChanged();
    return true;
  } catch {
    return false;
  }
}

function upsertMeta(
  id: string,
  patch: Partial<JournalVideoRecordingRecoveryMeta>,
): JournalVideoRecordingRecoveryMeta | null {
  const rows = readMetas(true);
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return null;
  const next = { ...rows[index], ...patch, updatedAt: nowIso() };
  rows[index] = next;
  return writeMetas(rows) ? next : null;
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
    status: meta.status ?? "recording",
    heartbeatAt: meta.heartbeatAt ?? timestamp,
    ownershipReleasedAt: undefined,
    videoBytes: meta.videoBytes ?? 0,
    audioBytes: meta.audioBytes ?? 0,
    videoChunkCount: 0,
    audioChunkCount: 0,
    startedAt: timestamp,
    updatedAt: timestamp,
  };
  const rows = readMetas(true).filter((row) => row.id !== next.id);
  rows.push(next);
  if (!writeMetas(rows)) {
    throw new Error("This browser could not create a durable recording checkpoint.");
  }
  return next;
}

export function updateInProgressJournalVideoRecording(
  id: string | null | undefined,
  patch: Partial<JournalVideoRecordingRecoveryMeta>,
): boolean {
  if (!id) return false;
  return upsertMeta(id, patch) != null;
}

export async function appendInProgressJournalVideoRecordingChunk(
  id: string | null | undefined,
  kind: "video" | "audio",
  index: number,
  blob: Blob,
): Promise<void> {
  if (!id || blob.size <= 0) return;
  const metaBeforeWrite = readMetas(true).find((row) => row.id === id);
  if (!metaBeforeWrite) throw new Error("Recording recovery metadata is missing.");

  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
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
      // On browsers that support explicit commit, start it inside this task so
      // a subsequent page freeze cannot leave the write merely queued.
      try {
        tx.commit?.();
      } catch {
        /* Auto-commit remains the cross-browser fallback. */
      }
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("Recording checkpoint was aborted."));
      tx.onerror = () => reject(tx.error ?? new Error("Recording checkpoint failed."));
    });
  } finally {
    db?.close();
  }

  // Metadata is advanced only after the Blob transaction commits. A recovery
  // row therefore never claims a chunk that did not reach IndexedDB.
  const meta = readMetas(true).find((row) => row.id === id) ?? metaBeforeWrite;
  const patch =
    kind === "video"
      ? {
          videoChunkCount: Math.max(meta.videoChunkCount, index + 1),
          videoBytes: Math.max(0, meta.videoBytes ?? 0) + blob.size,
        }
      : {
          audioChunkCount: Math.max(meta.audioChunkCount, index + 1),
          audioBytes: Math.max(0, meta.audioBytes ?? 0) + blob.size,
        };
  if (!upsertMeta(id, patch)) {
    throw new Error("The recording chunk was saved, but its recovery index could not be updated.");
  }
}

export function listInProgressJournalVideoRecordings(): JournalVideoRecordingRecoveryMeta[] {
  return readMetas().sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

/** Protect a live recorder from the recovery coordinator in this same page. */
export function setJournalVideoRecordingActiveInPage(id: string | null | undefined, active: boolean): void {
  if (!id) return;
  if (active) {
    activeRecoveryIdsInThisPage.add(id);
    const heartbeat = () => {
      if (!activeRecoveryIdsInThisPage.has(id)) return;
      try {
        upsertMeta(id, { heartbeatAt: nowIso(), ownershipReleasedAt: undefined });
      } catch {
        // Capture owns the in-memory copy and reports persistence failures via
        // its normal recovery state. Never interrupt recording for a heartbeat.
      }
    };
    heartbeat();
    const previousTimer = recoveryHeartbeatTimers.get(id);
    if (previousTimer != null && typeof window !== "undefined") window.clearInterval(previousTimer);
    if (typeof window !== "undefined") {
      recoveryHeartbeatTimers.set(
        id,
        window.setInterval(heartbeat, JOURNAL_VIDEO_ACTIVE_HEARTBEAT_MS),
      );
    }
    holdJournalVideoRecoveryLock(id);
  } else {
    activeRecoveryIdsInThisPage.delete(id);
    const timer = recoveryHeartbeatTimers.get(id);
    if (timer != null && typeof window !== "undefined") window.clearInterval(timer);
    recoveryHeartbeatTimers.delete(id);
    try {
      const releasedAt = nowIso();
      upsertMeta(id, { heartbeatAt: releasedAt, ownershipReleasedAt: releasedAt });
    } catch {
      // Releasing an in-memory owner must not strand the Web Lock. The existing
      // stale lease remains the fail-safe when durable metadata is unavailable.
    }
    releaseJournalVideoRecoveryLock(id);
    // The recovery coordinator may have ignored the last metadata event while
    // this recorder owned the draft. Notify it again once ownership is released.
    notifyRecoveryChanged();
  }
}

export function isJournalVideoRecordingActiveInPage(id: string): boolean {
  return activeRecoveryIdsInThisPage.has(id);
}

/** Fresh recording/paused leases belong to another live recorder and must not be claimed. */
export function isJournalVideoRecordingRecoveryClaimable(
  meta: JournalVideoRecordingRecoveryMeta,
  nowMs = Date.now(),
  staleMs = JOURNAL_VIDEO_RECOVERY_STALE_MS,
): boolean {
  if (isJournalVideoRecordingActiveInPage(meta.id)) return false;
  const heartbeatMs = Date.parse(meta.heartbeatAt ?? meta.updatedAt);
  if (!Number.isFinite(heartbeatMs)) return true;
  if (meta.status === "ready" || meta.status === "failed") {
    // API availability does not prove that the owner acquired its Web Lock.
    // Only an explicit durable release is immediately claimable. Otherwise a
    // continuously renewed heartbeat protects an arbitrarily long review and
    // a crashed owner becomes recoverable after a conservative stale window.
    if (meta.ownershipReleasedAt) return true;
    return nowMs - heartbeatMs >= JOURNAL_VIDEO_FINALIZED_RECOVERY_STALE_MS;
  }
  return nowMs - heartbeatMs >= staleMs;
}

export function listClaimableJournalVideoRecordings(
  nowMs = Date.now(),
  staleMs = JOURNAL_VIDEO_RECOVERY_STALE_MS,
): JournalVideoRecordingRecoveryMeta[] {
  return listInProgressJournalVideoRecordings().filter((meta) =>
    isJournalVideoRecordingRecoveryClaimable(meta, nowMs, staleMs),
  );
}

/** Patch body snap onto the in-progress recording for an entry (called when recording starts). */
export function updateJournalVideoRecordingBodySnapForEntry(
  entryId: string,
  body: string,
  anchor: number,
): void {
  const rows = readMetas().filter((row) => row.entryId === entryId);
  if (!rows.length) return;
  const recording = rows[rows.length - 1];
  upsertMeta(recording.id, { bodySnapBody: body, bodySnapAnchor: anchor });
}

export async function readInProgressJournalVideoRecording(
  id: string,
): Promise<JournalVideoRecordingRecoveryPayload | null> {
  const meta = readMetas().find((row) => row.id === id);
  if (!meta) return null;
  const db = await openDb();
  let chunks: StoredChunk[];
  try {
    chunks = await new Promise<StoredChunk[]>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const index = tx.objectStore(DB_STORE).index("recordingId");
      const req = index.getAll(id);
      req.onsuccess = () => resolve((req.result as StoredChunk[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }

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
  if (!writeMetas(readMetas(true).filter((row) => row.id !== id))) {
    throw new Error("The recording recovery index could not be cleared.");
  }
  try {
    const db = await openDb();
    try {
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
        tx.onabort = () => reject(tx.error ?? new Error("Recording recovery cleanup was aborted."));
        tx.onerror = () => reject(tx.error ?? new Error("Recording recovery cleanup failed."));
      });
    } finally {
      db.close();
    }
  } finally {
    // Metadata is already gone before another tab can acquire this id. A final
    // event after releasing ownership wakes coordinators that ignored it live.
    setJournalVideoRecordingActiveInPage(id, false);
  }
}
