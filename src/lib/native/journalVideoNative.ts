import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";
import type { JournalVideoCaptureResult } from "@/lib/journal/journalVideoCaptureLifecycle";
import { JOURNAL_VIDEO_MAX_UPLOAD_BYTES } from "@/lib/journal/journalVideoLimits";

export type NativeJournalVideoCaptureState =
  | "preparing"
  | "preview"
  | "recording"
  | "paused"
  | "interrupted"
  | "finalizing"
  | "pendingHandoff"
  | "failed"
  /** Transient event emitted after an explicit native discard. */
  | "discarded";

export type NativeJournalVideoInterruptionReason =
  | "manual"
  | "background"
  | "audio-interruption"
  | "camera-interruption"
  | "storage-limit"
  | "duration-limit"
  | "unknown";

export type NativeJournalVideoCaptureSnapshot = {
  sessionId: string;
  state: NativeJournalVideoCaptureState;
  fileUrl?: string;
  mimeType?: string;
  durationMs?: number;
  byteSize?: number;
  hasAudio?: boolean;
  canResume?: boolean;
  hasPendingResult?: boolean;
  isActiveSession?: boolean;
  userId?: string;
  entryId?: string;
  anchorOffset?: number;
  createdAt?: string;
  updatedAt?: string;
  interruptionReason?: NativeJournalVideoInterruptionReason | string;
  errorMessage?: string;
};

export type NativeJournalVideoCaptureUpdate = NativeJournalVideoCaptureSnapshot;

export type StartNativeJournalVideoCaptureOptions = {
  sessionId: string;
  userId: string;
  entryId: string;
  anchorOffset: number;
  maxDurationMs: number;
  maxBytes: number;
  teleprompter: string;
};

export type NativeJournalVideoCaptureOwner = {
  userId: string;
  entryId: string;
};

export const NATIVE_JOURNAL_VIDEO_EVENTS = [
  "journalVideoReady",
  "journalVideoInterrupted",
  "journalVideoStateChanged",
  "journalVideoProgress",
] as const;
export const NATIVE_JOURNAL_VIDEO_PENDING_CHANGED_EVENT =
  "yourbible:native-journal-video-pending-changed";

export type NativeJournalVideoEventName = (typeof NATIVE_JOURNAL_VIDEO_EVENTS)[number];

type JournalVideoRecorderPlugin = {
  startJournalVideoCapture(
    options: StartNativeJournalVideoCaptureOptions,
  ): Promise<NativeJournalVideoPluginSnapshot>;
  getJournalVideoCaptureState(options: {
    sessionId: string;
  }): Promise<NativeJournalVideoPluginSnapshot>;
  listPendingJournalVideoCaptures(): Promise<{
    captures: NativeJournalVideoPluginSnapshot[];
  }>;
  getPendingJournalVideoCapture(options: {
    sessionId: string;
  }): Promise<NativeJournalVideoPluginSnapshot>;
  resumePendingJournalVideoCapture(options: {
    sessionId: string;
  }): Promise<NativeJournalVideoPluginSnapshot>;
  acknowledgePendingJournalVideoCapture(options: { sessionId: string }): Promise<void>;
  discardPendingJournalVideoCapture(options: { sessionId: string }): Promise<void>;
  addListener(
    eventName: NativeJournalVideoEventName,
    listener: (event: NativeJournalVideoPluginSnapshot) => void,
  ): Promise<PluginListenerHandle>;
};

type NativeJournalVideoPluginSnapshot = Omit<
  NativeJournalVideoCaptureSnapshot,
  "byteSize" | "errorMessage"
> & {
  bytes?: number;
  byteSize?: number;
  error?: string;
  errorMessage?: string;
};

const nativeRecorder = registerPlugin<JournalVideoRecorderPlugin>("JournalVideoRecorder");

export class NativeJournalVideoCaptureCancelledError extends Error {
  constructor(sessionId: string) {
    super(`Native journal video capture ${sessionId} was discarded.`);
    this.name = "NativeJournalVideoCaptureCancelledError";
  }
}

function normalizeNativeJournalVideoCapture(
  capture: NativeJournalVideoPluginSnapshot,
): NativeJournalVideoCaptureSnapshot {
  return {
    ...capture,
    byteSize: capture.byteSize ?? capture.bytes,
    errorMessage: capture.errorMessage ?? capture.error,
  };
}

export function nativeJournalVideoCaptureSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function createNativeJournalVideoSessionId(): string {
  try {
    const id = crypto.randomUUID?.();
    if (id) return id;
  } catch {
    // Timestamp/random fallback is only for older WebViews without randomUUID.
  }
  return `native-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const NATIVE_JOURNAL_DRAFT_OWNER_PATTERN = /^journal-draft:[a-z0-9-]{8,96}$/i;

/** Durable local owner for a native recording created before a server entry exists. */
export function createNativeJournalVideoDraftOwnerId(): string {
  return `journal-draft:${createNativeJournalVideoSessionId()}`;
}

export function isNativeJournalVideoDraftOwnerId(value: string | null | undefined): value is string {
  return Boolean(value && NATIVE_JOURNAL_DRAFT_OWNER_PATTERN.test(value));
}

export async function startNativeJournalVideoCapture(
  options: StartNativeJournalVideoCaptureOptions,
): Promise<NativeJournalVideoCaptureSnapshot> {
  if (!nativeJournalVideoCaptureSupported()) {
    throw new Error("Native journal video capture is only available in the iOS app.");
  }
  const started = normalizeNativeJournalVideoCapture(
    await nativeRecorder.startJournalVideoCapture(options),
  );
  if (started.sessionId !== options.sessionId) {
    throw new Error("The native recorder returned a different journal video session id.");
  }
  notifyPendingNativeJournalVideoChanged();
  return started;
}

export function getNativeJournalVideoCapture(
  sessionId: string,
): Promise<NativeJournalVideoCaptureSnapshot> {
  return nativeRecorder
    .getJournalVideoCaptureState({ sessionId })
    .then(normalizeNativeJournalVideoCapture);
}

export function getPendingNativeJournalVideoCapture(
  sessionId: string,
): Promise<NativeJournalVideoCaptureSnapshot> {
  return nativeRecorder
    .getPendingJournalVideoCapture({ sessionId })
    .then(normalizeNativeJournalVideoCapture);
}

export async function listPendingNativeJournalVideoCaptures(): Promise<
  NativeJournalVideoCaptureSnapshot[]
> {
  if (!nativeJournalVideoCaptureSupported()) return [];
  const result = await nativeRecorder.listPendingJournalVideoCaptures();
  return Array.isArray(result.captures)
    ? result.captures.map(normalizeNativeJournalVideoCapture)
    : [];
}

const NATIVE_JOURNAL_ENTRY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NATIVE_LIFE_WEEK_OWNER_PATTERN = /^life-week:([^:]+):(\d+)$/;
const NATIVE_DRAFT_ENTRY_MAP_PREFIX = "yourbible.native-video-draft-entry.v1";

function nativeDraftEntryMapKey(userId: string, ownerId: string): string {
  return `${NATIVE_DRAFT_ENTRY_MAP_PREFIX}:${encodeURIComponent(userId)}:${encodeURIComponent(ownerId)}`;
}

export function rememberNativeJournalVideoDraftEntry(
  userId: string,
  ownerId: string,
  entryId: string,
): boolean {
  if (!isNativeJournalVideoDraftOwnerId(ownerId) || !NATIVE_JOURNAL_ENTRY_ID_PATTERN.test(entryId)) {
    return false;
  }
  try {
    localStorage.setItem(nativeDraftEntryMapKey(userId, ownerId), entryId);
    return true;
  } catch {
    return false;
  }
}

export function readNativeJournalVideoDraftEntry(
  userId: string,
  ownerId: string,
): string | null {
  if (!isNativeJournalVideoDraftOwnerId(ownerId)) return null;
  try {
    const entryId = localStorage.getItem(nativeDraftEntryMapKey(userId, ownerId));
    return entryId && NATIVE_JOURNAL_ENTRY_ID_PATTERN.test(entryId) ? entryId : null;
  } catch {
    return null;
  }
}

export function parseNativeLifeWeekVideoOwner(
  entryId: string | null | undefined,
): { subject: string; weekIndex: number } | null {
  const match = entryId?.match(NATIVE_LIFE_WEEK_OWNER_PATTERN);
  if (!match) return null;
  const weekIndex = Number(match[2]);
  if (!Number.isSafeInteger(weekIndex) || weekIndex < 0) return null;
  return { subject: match[1], weekIndex };
}

/** Deep link an exact-owner native draft back to the editor that can recover it. */
export function nativeJournalVideoRecoveryHref(
  capture: NativeJournalVideoCaptureSnapshot,
  currentUserId: string,
): string | null {
  if (capture.userId !== currentUserId || !capture.entryId) return null;
  if (parseNativeLifeWeekVideoOwner(capture.entryId)) {
    return `/life-weeks?resumeLifeWeekVideo=${encodeURIComponent(capture.entryId)}`;
  }
  if (isNativeJournalVideoDraftOwnerId(capture.entryId)) {
    const owner = encodeURIComponent(capture.entryId);
    const mappedEntryId = readNativeJournalVideoDraftEntry(currentUserId, capture.entryId);
    if (mappedEntryId) {
      return `/journal/${mappedEntryId}/edit?resumeVideo=1&nativeVideoOwner=${owner}`;
    }
    return `/journal/new?resumeVideo=1&nativeVideoOwner=${owner}`;
  }
  if (!NATIVE_JOURNAL_ENTRY_ID_PATTERN.test(capture.entryId)) return null;
  return `/journal/${capture.entryId}/edit?resumeVideo=1`;
}

export async function resumeNativeJournalVideoCapture(
  sessionId: string,
): Promise<NativeJournalVideoCaptureSnapshot> {
  const capture = normalizeNativeJournalVideoCapture(
    await nativeRecorder.resumePendingJournalVideoCapture({ sessionId }),
  );
  notifyPendingNativeJournalVideoChanged();
  return capture;
}

function notifyPendingNativeJournalVideoChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NATIVE_JOURNAL_VIDEO_PENDING_CHANGED_EVENT));
  }
}

/** Call only after the browser upload queue has durably accepted the Blob. */
export async function acknowledgeNativeJournalVideoQueued(sessionId: string): Promise<void> {
  await nativeRecorder.acknowledgePendingJournalVideoCapture({ sessionId });
  notifyPendingNativeJournalVideoChanged();
}

/** Explicit user discard. Closing, unmounting, and interruption must not call this. */
export async function discardNativeJournalVideoCapture(sessionId: string): Promise<void> {
  await nativeRecorder.discardPendingJournalVideoCapture({ sessionId });
  notifyPendingNativeJournalVideoChanged();
}

function ownerMatches(
  capture: NativeJournalVideoCaptureSnapshot,
  owner: NativeJournalVideoCaptureOwner,
): boolean {
  if (capture.userId !== owner.userId) return false;
  return capture.entryId === owner.entryId;
}

function captureUpdatedAt(capture: NativeJournalVideoCaptureSnapshot): number {
  const parsed = Date.parse(capture.updatedAt ?? capture.createdAt ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Find the newest exact-owner draft; never surface another user or entry's video. */
export async function findPendingNativeJournalVideoCapture(
  owner: NativeJournalVideoCaptureOwner | undefined,
): Promise<NativeJournalVideoCaptureSnapshot | null> {
  if (!owner) return null;
  const captures = await listPendingNativeJournalVideoCaptures();
  return (
    captures
      .filter(
        (capture) =>
          ownerMatches(capture, owner),
      )
      .sort((a, b) => captureUpdatedAt(b) - captureUpdatedAt(a))[0] ?? null
  );
}

export type WaitForNativeJournalVideoCaptureOptions = {
  signal?: AbortSignal;
  pollIntervalMs?: number;
  maxConsecutivePollErrors?: number;
  onUpdate?: (update: NativeJournalVideoCaptureUpdate) => void;
};

function terminalCaptureError(snapshot: NativeJournalVideoCaptureSnapshot): Error | null {
  if (snapshot.state === "discarded") {
    return new NativeJournalVideoCaptureCancelledError(snapshot.sessionId);
  }
  if (snapshot.state === "failed") {
    return new Error(snapshot.errorMessage || "Native journal video capture failed.");
  }
  return null;
}

/**
 * Wait for a durable native file. Events provide fast UI updates; polling closes
 * event races and restores a session after WebView reload or process relaunch.
 */
export async function waitForNativeJournalVideoCaptureReady(
  sessionId: string,
  options: WaitForNativeJournalVideoCaptureOptions = {},
): Promise<NativeJournalVideoCaptureSnapshot> {
  const pollIntervalMs = options.pollIntervalMs ?? 750;
  const maxPollErrors = options.maxConsecutivePollErrors ?? 5;
  const listenerHandles: PluginListenerHandle[] = [];
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let consecutivePollErrors = 0;
  let settled = false;
  let resolvingReady = false;
  let resolveWait!: (capture: NativeJournalVideoCaptureSnapshot) => void;
  let rejectWait!: (error: unknown) => void;

  const wait = new Promise<NativeJournalVideoCaptureSnapshot>((resolve, reject) => {
    resolveWait = resolve;
    rejectWait = reject;
  });

  const finishWithSnapshot = async (update: NativeJournalVideoCaptureUpdate) => {
    if (settled || update.sessionId !== sessionId) return;
    options.onUpdate?.(update);
    const terminalError = terminalCaptureError(update);
    if (terminalError) {
      settled = true;
      rejectWait(terminalError);
      return;
    }
    if (update.state !== "pendingHandoff" || resolvingReady) return;

    resolvingReady = true;
    try {
      const ready = update.fileUrl
        ? update
        : await getPendingNativeJournalVideoCapture(sessionId);
      if (ready.state !== "pendingHandoff" || !ready.fileUrl) {
        throw new Error("The native recorder reported ready before its video file was available.");
      }
      settled = true;
      options.onUpdate?.(ready);
      resolveWait(ready);
    } catch (error) {
      settled = true;
      rejectWait(error);
    } finally {
      resolvingReady = false;
    }
  };

  const poll = async () => {
    if (settled || options.signal?.aborted) return;
    try {
      const snapshot = await getNativeJournalVideoCapture(sessionId);
      consecutivePollErrors = 0;
      await finishWithSnapshot(snapshot);
    } catch (error) {
      consecutivePollErrors += 1;
      if (consecutivePollErrors >= maxPollErrors) {
        settled = true;
        rejectWait(error);
      }
    }
    if (!settled) pollTimer = setTimeout(() => void poll(), pollIntervalMs);
  };

  const abort = () => {
    if (settled) return;
    settled = true;
    rejectWait(new DOMException("Native journal video wait was aborted.", "AbortError"));
  };
  options.signal?.addEventListener("abort", abort, { once: true });

  const registrations = await Promise.allSettled(
    NATIVE_JOURNAL_VIDEO_EVENTS.map(async (eventName) => {
      const handle = await nativeRecorder.addListener(eventName, (update) => {
        void finishWithSnapshot(normalizeNativeJournalVideoCapture(update));
      });
      listenerHandles.push(handle);
    }),
  );
  // A missing listener implementation is recoverable because polling is the
  // authoritative fallback. Query immediately after registration to close the
  // start-to-listener race.
  void registrations;
  if (!settled) void poll();

  try {
    return await wait;
  } finally {
    if (pollTimer) clearTimeout(pollTimer);
    options.signal?.removeEventListener("abort", abort);
    await Promise.allSettled(listenerHandles.map((handle) => handle.remove()));
  }
}

export async function readNativeJournalVideoBlob(
  capture: NativeJournalVideoCaptureSnapshot,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<Blob> {
  if (capture.state !== "pendingHandoff" || !capture.fileUrl) {
    throw new Error("The native journal video is not ready to review.");
  }
  const descriptorBytes = capture.byteSize ?? 0;
  if (descriptorBytes <= 0) throw new Error("The native journal video descriptor was empty.");
  if (descriptorBytes > JOURNAL_VIDEO_MAX_UPLOAD_BYTES) {
    throw new Error("The native journal video exceeds the upload limit.");
  }
  const convertedUrl = Capacitor.convertFileSrc(capture.fileUrl);
  const response = signal ? await fetcher(convertedUrl, { signal }) : await fetcher(convertedUrl);
  if (!response.ok) {
    throw new Error(`Could not read the native journal video (${response.status}).`);
  }
  const source = await response.blob();
  if (source.size <= 0) throw new Error("The native journal video file was empty.");
  if (source.size > JOURNAL_VIDEO_MAX_UPLOAD_BYTES) {
    throw new Error("The native journal video exceeds the upload limit.");
  }
  const mimeType = capture.mimeType?.trim() || source.type || "video/mp4";
  return source.type === mimeType ? source : source.slice(0, source.size, mimeType);
}

export function buildNativeJournalVideoCaptureResult(
  capture: NativeJournalVideoCaptureSnapshot,
  video: Blob,
): JournalVideoCaptureResult {
  return {
    video,
    audio: null,
    liveTranscript: "",
    peakLiveTranscript: "",
    chapters: [],
    durationMs: Math.max(0, capture.durationMs ?? 0),
    recoveryDraftId: capture.sessionId,
    nativeCaptureId: capture.sessionId,
  };
}
