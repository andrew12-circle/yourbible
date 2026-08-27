/**
 * Retry failed journal video uploads when back online.
 * Stores metadata in localStorage; blobs in IndexedDB.
 */

import type { JournalVideoCaptureResult } from "@/lib/journal/journalVideoCaptureLifecycle";
import type { JournalVideoChapter } from "@/lib/journal/journalVideoChapters";
import type { JournalVideoRecordingRecoveryMeta } from "@/lib/journal/journalVideoRecordingRecovery";

export const JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY = "yb_journal_video_upload_queue_v1";
export const JOURNAL_VIDEO_UPLOAD_QUEUE_CHANGED_EVENT =
  "yourbible:journal-video-upload-queue-changed";
const DB_NAME = "yb_journal_video_uploads";
const DB_STORE = "blobs";
const QUEUE_LOCK_NAME = "yourbible-journal-video-upload-queue";

export type JournalVideoUploadStage =
  | "queued"
  | "merging-live-transcript"
  | "uploading"
  | "transcribing"
  | "merging-final-transcript"
  | "deferred-transcription"
  | "failed";

export type QueuedJournalVideoUpload = {
  id: string;
  userId: string;
  entryId: string;
  anchorOffset: number;
  durationMs: number;
  liveTranscript: string;
  peakLiveTranscript?: string;
  /** Optional server transcript waiting only for its final entry-body merge. */
  finalTranscript?: string;
  /** Frozen pre-record body for transcript merge after background upload. */
  bodySnapBody?: string;
  bodySnapAnchor?: number;
  createdAt: string;
  /** Optional v2 retry fields. Older v1 queue rows remain readable. */
  stage?: JournalVideoUploadStage;
  attemptCount?: number;
  transcriptionAttemptCount?: number;
  lastAttemptAt?: string;
  lastError?: string;
  uploadedAt?: string;
  storagePath?: string;
  videoId?: string;
};

export type JournalVideoUploadQueueChangeKind = "enqueued" | "updated" | "removed";

export type JournalVideoUploadQueueChangeDetail = {
  kind: JournalVideoUploadQueueChangeKind;
  id: string;
};

export type JournalVideoUploadQueueLockResult<T> =
  | { claimed: false }
  | { claimed: true; value: T };

export type FinalizedJournalVideoRecoveryQueueMeta = Pick<
  JournalVideoRecordingRecoveryMeta,
  | "id"
  | "userId"
  | "entryId"
  | "anchorOffset"
  | "durationMs"
  | "bodySnapBody"
  | "bodySnapAnchor"
  | "startedAt"
>;

function readMeta(strict = false): QueuedJournalVideoUpload[] {
  if (typeof window === "undefined") {
    if (strict) throw new Error("Journal video uploads require browser storage.");
    return [];
  }
  try {
    const raw = localStorage.getItem(JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedJournalVideoUpload[];
    if (Array.isArray(parsed)) return parsed;
    if (strict) throw new Error("The upload index is not a list.");
    return [];
  } catch (error) {
    if (strict) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not read the journal video upload index: ${message}`);
    }
    return [];
  }
}

function writeMeta(
  rows: QueuedJournalVideoUpload[],
  change?: JournalVideoUploadQueueChangeDetail,
): void {
  if (typeof window === "undefined") {
    throw new Error("Journal video uploads require browser storage.");
  }
  try {
    localStorage.setItem(JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY, JSON.stringify(rows));
    if (change) {
      window.dispatchEvent(
        new CustomEvent<JournalVideoUploadQueueChangeDetail>(
          JOURNAL_VIDEO_UPLOAD_QUEUE_CHANGED_EVENT,
          { detail: change },
        ),
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not save the journal video upload index: ${message}`);
  }
}

function webLocksAvailable(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.locks?.request === "function";
}

/** Serialize queue consumers across tabs. A rejected advertised lock fails closed. */
export async function withJournalVideoUploadQueueLock<T>(
  work: () => Promise<T>,
): Promise<JournalVideoUploadQueueLockResult<T>> {
  if (!webLocksAvailable()) return { claimed: true, value: await work() };
  let callbackStarted = false;
  try {
    return await navigator.locks.request(
      QUEUE_LOCK_NAME,
      { mode: "exclusive", ifAvailable: true },
      async (lock): Promise<JournalVideoUploadQueueLockResult<T>> => {
        if (!lock) return { claimed: false };
        callbackStarted = true;
        return { claimed: true, value: await work() };
      },
    );
  } catch (error) {
    if (callbackStarted) throw error;
    return { claimed: false };
  }
}

/** Wait for exclusive queue ownership while retaining any Blob captured by work's closure. */
export async function withJournalVideoUploadQueueWaitingLock<T>(
  work: () => Promise<T>,
): Promise<T> {
  if (!webLocksAvailable()) return work();
  return navigator.locks.request(QUEUE_LOCK_NAME, { mode: "exclusive" }, async () => work());
}

function parsedQueueIds(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as Array<{ id?: unknown }>;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.flatMap((row) => (typeof row?.id === "string" && row.id ? [row.id] : [])),
    );
  } catch {
    return new Set();
  }
}

/** Identify true additions; stage updates/removals must not start retry loops. */
export function journalVideoQueueStorageAddedIds(
  oldValue: string | null,
  newValue: string | null,
): string[] {
  const before = parsedQueueIds(oldValue);
  return [...parsedQueueIds(newValue)].filter((id) => !before.has(id));
}

const ACTIVE_QUEUE_STAGES = new Set<QueuedJournalVideoUpload["stage"]>([
  "merging-live-transcript",
  "uploading",
  "transcribing",
  "merging-final-transcript",
]);
export const JOURNAL_VIDEO_QUEUE_RETRY_DELAYS_MS = [30_000, 120_000, 300_000, 900_000] as const;

/** Delay retries while the normal save path has a fresh in-flight queue item. */
export function journalVideoQueueFreshAttemptDelay(
  rows: QueuedJournalVideoUpload[],
  nowMs = Date.now(),
  leaseMs = 60_000,
): number {
  return rows.reduce((delay, row) => {
    if (!ACTIVE_QUEUE_STAGES.has(row.stage) || !row.lastAttemptAt) return delay;
    const attemptedAt = Date.parse(row.lastAttemptAt);
    if (!Number.isFinite(attemptedAt)) return delay;
    return Math.max(delay, Math.max(0, attemptedAt + leaseMs - nowMs));
  }, 0);
}

/**
 * Return the longest lease/backoff still protecting any row. The processor is
 * intentionally whole-queue, so one fresh deferred row delays the pass rather
 * than causing a duplicate transcription while processing newer rows.
 */
export function journalVideoQueueNextRetryDelay(
  rows: QueuedJournalVideoUpload[],
  nowMs = Date.now(),
  retryDelaysMs: readonly number[] = JOURNAL_VIDEO_QUEUE_RETRY_DELAYS_MS,
): number {
  let delay = journalVideoQueueFreshAttemptDelay(rows, nowMs);
  if (!retryDelaysMs.length) return delay;
  for (const row of rows) {
    if ((row.stage !== "deferred-transcription" && row.stage !== "failed") || !row.lastAttemptAt) {
      continue;
    }
    const attemptedAt = Date.parse(row.lastAttemptAt);
    if (!Number.isFinite(attemptedAt)) continue;
    const attempts = Math.max(1, row.attemptCount ?? 0, row.transcriptionAttemptCount ?? 0);
    const backoff = retryDelaysMs[Math.min(attempts - 1, retryDelaysMs.length - 1)];
    delay = Math.max(delay, Math.max(0, attemptedAt + backoff - nowMs));
  }
  return delay;
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

async function enqueueJournalVideoUploadUnlocked(
  meta: QueuedJournalVideoUpload,
  video: Blob,
  audio: Blob | null,
  chapters: JournalVideoChapter[] = [],
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put({ video, audio, chapters }, meta.id);
      try {
        tx.commit?.();
      } catch {
        // Safari relies on the normal IndexedDB auto-commit path.
      }
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("Video queue write was aborted."));
      tx.onerror = () => reject(tx.error ?? new Error("Video queue write failed."));
    });
  } finally {
    db.close();
  }
  const rows = readMeta(true).filter((r) => r.id !== meta.id);
  rows.push({
    ...meta,
    stage: meta.stage ?? "queued",
    attemptCount: meta.attemptCount ?? 0,
    transcriptionAttemptCount: meta.transcriptionAttemptCount ?? 0,
  });
  // The enqueue promise does not resolve until both the Blob and its lookup
  // metadata are durable. Callers may then release the larger recovery copy.
  writeMeta(rows, { kind: "enqueued", id: meta.id });
}

export async function enqueueJournalVideoUpload(
  meta: QueuedJournalVideoUpload,
  video: Blob,
  audio: Blob | null,
  chapters: JournalVideoChapter[] = [],
): Promise<void> {
  await withJournalVideoUploadQueueWaitingLock(() =>
    enqueueJournalVideoUploadUnlocked(meta, video, audio, chapters),
  );
}

type QueuedJournalVideoPayload = {
  video: Blob;
  audio: Blob | null;
  chapters: JournalVideoChapter[];
};

async function readQueuedPayload(id: string): Promise<QueuedJournalVideoPayload | null> {
  const db = await openDb();
  let payload: {
    video: Blob;
    audio: Blob | null;
    chapters?: JournalVideoChapter[];
  } | null;
  try {
    payload = await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(id);
      req.onsuccess = () =>
        resolve(
          (req.result as {
            video: Blob;
            audio: Blob | null;
            chapters?: JournalVideoChapter[];
          }) ?? null,
        );
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
  return payload
    ? { video: payload.video, audio: payload.audio, chapters: payload.chapters ?? [] }
    : null;
}

/** Read queued blobs without removing them (safe to retry on upload failure). */
export async function readQueuedJournalVideoUpload(id: string): Promise<QueuedJournalVideoPayload | null> {
  return readQueuedPayload(id);
}

export function buildFinalizedJournalVideoRecoveryQueueMeta(
  result: JournalVideoCaptureResult,
  recovery: FinalizedJournalVideoRecoveryQueueMeta,
): QueuedJournalVideoUpload {
  if (!recovery.id || (result.recoveryDraftId && result.recoveryDraftId !== recovery.id)) {
    throw new Error("The finalized recording does not match its recovery draft.");
  }
  return {
    id: recovery.id,
    userId: recovery.userId,
    entryId: recovery.entryId,
    anchorOffset: recovery.anchorOffset,
    durationMs: result.durationMs || recovery.durationMs,
    liveTranscript: result.liveTranscript,
    peakLiveTranscript: result.peakLiveTranscript,
    bodySnapBody: recovery.bodySnapBody,
    bodySnapAnchor: recovery.bodySnapAnchor,
    createdAt: recovery.startedAt || new Date().toISOString(),
    stage: "queued",
    attemptCount: 0,
    transcriptionAttemptCount: 0,
  };
}

/**
 * Promote a finalized recovery payload to the durable upload queue under the
 * same stable recording id. Existing complete queue copies win idempotently.
 */
export async function enqueueFinalizedJournalVideoCaptureForRecovery(
  result: JournalVideoCaptureResult,
  recovery: FinalizedJournalVideoRecoveryQueueMeta,
): Promise<QueuedJournalVideoUpload> {
  if (result.video.size <= 0) throw new Error("A finalized video Blob is required for upload.");
  const built = buildFinalizedJournalVideoRecoveryQueueMeta(result, recovery);
  return withJournalVideoUploadQueueWaitingLock(async () => {
    const existing = readMeta(true).find((row) => row.id === recovery.id);
    if (existing) {
      if (existing.userId !== recovery.userId || existing.entryId !== recovery.entryId) {
        throw new Error("The recovery id is already owned by a different journal entry.");
      }
      const payload = await readQueuedPayload(recovery.id);
      const canReplaceWithLargerFinalizedBlob =
        Boolean(payload?.video.size) &&
        result.video.size > (payload?.video.size ?? 0) &&
        !existing.storagePath &&
        !existing.videoId &&
        (existing.stage == null || existing.stage === "queued" || existing.stage === "failed");
      if (payload?.video.size && !canReplaceWithLargerFinalizedBlob) return existing;
    }
    const next = existing
      ? {
          ...existing,
          ...built,
          stage: existing.stage ?? built.stage,
          attemptCount: existing.attemptCount ?? 0,
          transcriptionAttemptCount: existing.transcriptionAttemptCount ?? 0,
        }
      : built;
    await enqueueJournalVideoUploadUnlocked(next, result.video, result.audio, result.chapters);
    return next;
  });
}

/** Persist retry/stage diagnostics without replacing backward-compatible fields. */
export function updateQueuedJournalVideoUpload(
  id: string,
  patch: Partial<QueuedJournalVideoUpload>,
): QueuedJournalVideoUpload | null {
  const rows = readMeta(true);
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return null;
  const next = { ...rows[index], ...patch, id: rows[index].id };
  rows[index] = next;
  writeMeta(rows, { kind: "updated", id });
  return next;
}

/** Remove a successfully uploaded item from the queue. */
export async function removeQueuedJournalVideoUpload(id: string): Promise<void> {
  writeMeta(readMeta(true).filter((r) => r.id !== id), { kind: "removed", id });
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("Video queue cleanup was aborted."));
      tx.onerror = () => reject(tx.error ?? new Error("Video queue cleanup failed."));
    });
  } finally {
    db.close();
  }
}

/** @deprecated Prefer readQueuedJournalVideoUpload + removeQueuedJournalVideoUpload on success. */
export async function dequeueJournalVideoUpload(id: string): Promise<QueuedJournalVideoPayload | null> {
  const payload = await readQueuedPayload(id);
  if (payload) await removeQueuedJournalVideoUpload(id);
  return payload;
}

export function listQueuedJournalVideoUploads(userId?: string | null): QueuedJournalVideoUpload[] {
  const rows = readMeta();
  return userId ? rows.filter((row) => row.userId === userId) : rows;
}
