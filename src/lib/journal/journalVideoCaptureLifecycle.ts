import type { JournalVideoCaptureSettings } from "@/lib/journal/journalVideoCaptureSettings";
import type { JournalVideoChapter } from "@/lib/journal/journalVideoChapters";
import type { JournalVideoRecordingRecoveryMeta } from "@/lib/journal/journalVideoRecordingRecovery";
import type {
  JournalVideoCaptureMode,
  ScreenBubbleLayout,
} from "@/lib/journal/screenRecordingComposite";

export type JournalVideoCapturePhase =
  | "idle"
  | "preview"
  | "countdown"
  | "recording"
  | "paused"
  | "processing";

export type JournalVideoDurableBackupState = "idle" | "saving" | "saved" | "at-risk";

export type JournalVideoInterruptionReason =
  | "manual"
  | "silence"
  | "background"
  | "track-ended"
  | "recorder-stopped"
  | "unmounted"
  | "unknown";

export type JournalVideoMediaKind = "video" | "audio";

export type JournalVideoRecoveryLifecyclePatch = Partial<
  Pick<
    JournalVideoRecordingRecoveryMeta,
    | "status"
    | "ownerId"
    | "heartbeatAt"
    | "finalizedAt"
    | "interruptionReason"
    | "videoBytes"
    | "audioBytes"
    | "persistenceError"
  >
>;

export type JournalVideoCaptureResult = {
  video: Blob;
  audio: Blob | null;
  liveTranscript: string;
  peakLiveTranscript: string;
  chapters: JournalVideoChapter[];
  durationMs: number;
  recoveryDraftId?: string | null;
  /** Opaque AVFoundation draft id. Delete only after upload-queue durability. */
  nativeCaptureId?: string | null;
};

export interface UseJournalVideoCaptureOptions {
  onInterim?: (partial: string) => void;
  language?: string;
  onScreenShareEnded?: () => void;
  onMaxDuration?: () => void;
  settings?: JournalVideoCaptureSettings;
  recovery?: {
    userId: string;
    entryId: string;
    anchorOffset: number;
  };
}

export interface UseJournalVideoCaptureApi {
  supported: boolean;
  mode: JournalVideoCaptureMode | null;
  phase: JournalVideoCapturePhase;
  error: string | null;
  interim: string;
  countdown: number | null;
  recordingElapsedMs: number;
  recordingBytes: number;
  recordingRemainingMs: number;
  maxDurationMs: number;
  previewStream: MediaStream | null;
  facingMode: "user" | "environment";
  deviceId: string | null;
  audioDeviceId: string | null;
  chapters: JournalVideoChapter[];
  settings: JournalVideoCaptureSettings;
  screenUsesCameraAudio: boolean;
  durableBackupState: JournalVideoDurableBackupState;
  durableBackupError: string | null;
  interruptionReason: JournalVideoInterruptionReason | null;
  canResume: boolean;
  bindPreview: (el: HTMLVideoElement | null) => void;
  openPreview: (mode: JournalVideoCaptureMode) => Promise<void>;
  beginCountdown: () => void;
  cancelCountdown: () => void;
  skipCountdown: () => void;
  startRecording: () => void;
  pauseRecording: (reason?: JournalVideoInterruptionReason) => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<JournalVideoCaptureResult | null>;
  releaseCapture: () => void;
  cancel: () => void;
  switchFacing: () => Promise<void>;
  selectDevice: (deviceId: string) => Promise<void>;
  selectAudioDevice: (audioDeviceId: string) => Promise<void>;
  markChapter: (label?: string) => string | null;
  setBubbleLayout: (layout: Partial<ScreenBubbleLayout>) => void;
  patchSettings: (patch: Partial<JournalVideoCaptureSettings>) => void;
}

export const JOURNAL_VIDEO_STOP_TIMEOUT_MS = 4_000;
export const JOURNAL_VIDEO_CHECKPOINT_TIMEOUT_MS = 900;

export function sumJournalVideoBlobBytes(chunks: readonly Blob[]): number {
  return chunks.reduce((total, chunk) => total + chunk.size, 0);
}

type JournalVideoFinalizationSummaryOptions = {
  videoBlob: Blob | null;
  audioBlob: Blob | null;
  videoChunks: readonly Blob[];
  audioChunks: readonly Blob[];
  recordersStopped: boolean;
  writesPersisted: boolean;
  persistenceError: string | null;
  now: string;
};

export function buildJournalVideoFinalizationSummary({
  videoBlob,
  audioBlob,
  videoChunks,
  audioChunks,
  recordersStopped,
  writesPersisted,
  persistenceError,
  now,
}: JournalVideoFinalizationSummaryOptions) {
  const videoBytes = videoBlob?.size ?? sumJournalVideoBlobBytes(videoChunks);
  const audioBytes = audioBlob?.size ?? sumJournalVideoBlobBytes(audioChunks);
  const ready = videoBytes > 0 && recordersStopped && writesPersisted;
  const patch: JournalVideoRecoveryLifecyclePatch = {
    status: ready ? "ready" : persistenceError ? "failed" : "finalizing",
    heartbeatAt: now,
    ...(ready ? { finalizedAt: now } : {}),
    videoBytes,
    audioBytes,
    ...(persistenceError ? { persistenceError } : {}),
  };
  return { ready, patch };
}

export function journalVideoTracksCanResume(stream: MediaStream | null): boolean {
  const tracks = stream?.getTracks() ?? [];
  return tracks.length > 0 && tracks.every((track) => track.readyState === "live");
}

export function buildJournalVideoSalvageBlob(
  latchedBlob: Blob | null,
  chunks: readonly Blob[],
  mimeType: string | undefined,
): Blob | null {
  if (latchedBlob?.size) return latchedBlob;
  const blob = new Blob(chunks, mimeType ? { type: mimeType } : undefined);
  return blob.size > 0 ? blob : null;
}

export async function journalVideoWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: () => T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback()), timeoutMs);
  });
  const result = await Promise.race([promise, timeout]);
  if (timer) clearTimeout(timer);
  return result;
}

type DataVersionRefs = Record<JournalVideoMediaKind, { current: number }>;
type DataWaiterRefs = Record<JournalVideoMediaKind, { current: Set<() => void> }>;

export type JournalVideoDataCheckpoint = {
  notify: (kind: JournalVideoMediaKind) => void;
  request: (
    videoRecorder: MediaRecorder | null,
    audioRecorder: MediaRecorder | null,
    timeoutMs: number,
  ) => Promise<boolean>;
};

export function createJournalVideoDataCheckpoint(): JournalVideoDataCheckpoint {
  const versions: DataVersionRefs = {
    video: { current: 0 },
    audio: { current: 0 },
  };
  const waiters: DataWaiterRefs = {
    video: { current: new Set() },
    audio: { current: new Set() },
  };

  const notify = (kind: JournalVideoMediaKind) => {
    versions[kind].current += 1;
    for (const resolve of waiters[kind].current) resolve();
    waiters[kind].current.clear();
  };

  const waitForNextData = (kind: JournalVideoMediaKind, priorVersion: number, timeoutMs: number) => {
    if (versions[kind].current > priorVersion) return Promise.resolve();
    return new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        waiters[kind].current.delete(finish);
        resolve();
      };
      const timer = setTimeout(finish, timeoutMs);
      waiters[kind].current.add(finish);
    });
  };

  const requestOne = (
    kind: JournalVideoMediaKind,
    recorder: MediaRecorder | null,
    timeoutMs: number,
  ): Promise<void> | null => {
    if (!recorder || recorder.state === "inactive" || typeof recorder.requestData !== "function") {
      return null;
    }
    const priorVersion = versions[kind].current;
    try {
      recorder.requestData();
      return waitForNextData(kind, priorVersion, timeoutMs);
    } catch {
      return null;
    }
  };

  return {
    notify,
    async request(videoRecorder, audioRecorder, timeoutMs) {
      const waits = [
        requestOne("video", videoRecorder, timeoutMs),
        requestOne("audio", audioRecorder, timeoutMs),
      ].filter((wait): wait is Promise<void> => Boolean(wait));
      if (waits.length === 0) return false;
      await Promise.all(waits);
      return true;
    },
  };
}

export type JournalVideoChunkWriteCoordinator = {
  enqueue: (kind: JournalVideoMediaKind, write: () => Promise<void>) => void;
  drain: () => Promise<void>;
  getError: () => string | null;
};

export function createJournalVideoChunkWriteCoordinator(
  onError: (error: unknown) => void,
): JournalVideoChunkWriteCoordinator {
  const chains: Record<JournalVideoMediaKind, Promise<void>> = {
    video: Promise.resolve(),
    audio: Promise.resolve(),
  };
  const pending = new Set<Promise<void>>();
  let errorMessage: string | null = null;

  return {
    enqueue(kind, write) {
      const next = chains[kind].catch(() => undefined).then(write);
      const observed = next.catch((error) => {
        errorMessage ??= error instanceof Error ? error.message : String(error);
        onError(error);
        throw error;
      });
      chains[kind] = observed.catch(() => undefined);
      pending.add(observed);
      void observed.finally(() => pending.delete(observed)).catch(() => undefined);
    },
    async drain() {
      while (pending.size > 0) await Promise.allSettled([...pending]);
      if (errorMessage) throw new Error(errorMessage);
    },
    getError: () => errorMessage,
  };
}

export async function checkpointJournalVideoRecorders(
  checkpoint: JournalVideoDataCheckpoint,
  writer: JournalVideoChunkWriteCoordinator,
  videoRecorder: MediaRecorder | null,
  audioRecorder: MediaRecorder | null,
): Promise<{ requested: boolean; writesSettled: boolean; error: string | null }> {
  const requested = await checkpoint.request(
    videoRecorder,
    audioRecorder,
    JOURNAL_VIDEO_CHECKPOINT_TIMEOUT_MS,
  );
  const writesSettled = await journalVideoWithTimeout(
    writer.drain().then(
      () => true,
      () => false,
    ),
    JOURNAL_VIDEO_STOP_TIMEOUT_MS,
    () => false,
  );
  return { requested, writesSettled, error: writer.getError() };
}

export function requestPersistentJournalVideoStorage(): void {
  try {
    void navigator.storage?.persist?.().catch(() => false);
  } catch {
    /* Storage persistence is optional and must never block capture. */
  }
}

export type JournalVideoRecorderStopOutcome = {
  blob: Blob | null;
  stopped: boolean;
  completion: Promise<Blob | null>;
};

type StopJournalVideoRecorderOptions = {
  recorder: MediaRecorder | null;
  timeoutMs: number;
  mimeType: string | undefined;
  getLatchedBlob: () => Blob | null;
  getChunks: () => readonly Blob[];
  setResolver: (resolve: ((blob: Blob | null) => void) | null) => void;
  requestStop: (recorder: MediaRecorder) => boolean;
};

export async function stopJournalVideoRecorderWithFallback({
  recorder,
  timeoutMs,
  mimeType,
  getLatchedBlob,
  getChunks,
  setResolver,
  requestStop,
}: StopJournalVideoRecorderOptions): Promise<JournalVideoRecorderStopOutcome> {
  const salvage = () => buildJournalVideoSalvageBlob(getLatchedBlob(), getChunks(), mimeType);
  let didStop = !recorder || recorder.state === "inactive";
  const completion = new Promise<Blob | null>((resolve) => {
    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      didStop = true;
      setResolver(null);
      resolve(blob?.size ? blob : salvage());
    };
    setResolver(finish);
    if (!recorder || recorder.state === "inactive") finish(salvage());
    else requestStop(recorder);
  });
  const result = await journalVideoWithTimeout(
    completion.then((blob) => ({ blob, stopped: true })),
    timeoutMs,
    () => ({ blob: salvage(), stopped: didStop }),
  );
  return { ...result, completion };
}

export function observeJournalVideoStreamTracks(
  stream: MediaStream,
  isCurrentTrack: (track: MediaStreamTrack) => boolean,
  onEnded: () => void,
): () => void {
  const listeners = stream.getTracks().map((track) => {
    const handleEnded = () => {
      if (isCurrentTrack(track)) onEnded();
    };
    track.addEventListener("ended", handleEnded);
    return { track, handleEnded };
  });
  return () => {
    for (const { track, handleEnded } of listeners) {
      track.removeEventListener("ended", handleEnded);
    }
  };
}
