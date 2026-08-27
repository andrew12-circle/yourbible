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

export function resumeNativeJournalVideoCapture(
  sessionId: string,
): Promise<NativeJournalVideoCaptureSnapshot> {
  return nativeRecorder
    .resumePendingJournalVideoCapture({ sessionId })
    .then(normalizeNativeJournalVideoCapture);
}

/** Call only after the browser upload queue has durably accepted the Blob. */
export function acknowledgeNativeJournalVideoQueued(sessionId: string): Promise<void> {
  return nativeRecorder.acknowledgePendingJournalVideoCapture({ sessionId });
}

/** Explicit user discard. Closing, unmounting, and interruption must not call this. */
export function discardNativeJournalVideoCapture(sessionId: string): Promise<void> {
  return nativeRecorder.discardPendingJournalVideoCapture({ sessionId });
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
  const response = await fetcher(convertedUrl);
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
