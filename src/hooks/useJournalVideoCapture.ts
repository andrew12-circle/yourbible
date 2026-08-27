import { useCallback, useEffect, useRef, useState } from "react";
import {
  canChangeJournalVideoDevices,
  isJournalVideoLiveCapture,
  restartJournalVideoAudioSidecar,
  setJournalVideoStreamAudioEnabled,
  swapJournalVideoAudioTrack,
  swapJournalVideoCameraTrack,
} from "@/lib/journal/journalVideoLiveDevices";
import type { JournalVideoCaptureSettings } from "@/lib/journal/journalVideoCaptureSettings";
import { readJournalVideoCaptureSettings } from "@/lib/journal/journalVideoCaptureSettings";
import {
  formatChapterLabel,
  type JournalVideoChapter,
} from "@/lib/journal/journalVideoChapters";
import type { CameraFacing } from "@/lib/journal/journalVideoDevices";
import { toggleCameraFacing } from "@/lib/journal/journalVideoDevices";
import {
  buildJournalVideoConstraints,
  createJournalAudioSidecarRecorder,
  createJournalVideoMediaRecorder,
  createJournalVideoRecoveryId,
  journalVideoCaptureSupported,
  startJournalMediaRecorder,
  stopMediaRecorderWithFlush,
  tuneJournalVideoStream,
} from "@/lib/journal/videos";
import {
  JOURNAL_VIDEO_MAX_DURATION_MS,
  journalVideoEffectiveRemainingMs,
  shouldStopJournalVideoRecording,
  sumJournalVideoBytes,
} from "@/lib/journal/journalVideoLimits";
import {
  createScreenCompositeSession,
  type JournalVideoCaptureMode,
  type ScreenBubbleLayout,
  type ScreenCompositeSession,
} from "@/lib/journal/screenRecordingComposite";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import { useJournalVideoPageLifecycle } from "@/hooks/useJournalVideoPageLifecycle";
import { composeVideoLiveTranscript, appendVideoSpeechFinal, pickBestVideoJournalTranscript } from "@/lib/journal/journalVideoBody";
import {
  bodySnapFromMeta,
  persistVideoJournalTranscriptToEntry,
} from "@/lib/journal/journalVideoEntryMerge";
import {
  appendInProgressJournalVideoRecordingChunk,
  clearInProgressJournalVideoRecording,
  listInProgressJournalVideoRecordings,
  setJournalVideoRecordingActiveInPage,
  startInProgressJournalVideoRecording,
  updateInProgressJournalVideoRecording,
} from "@/lib/journal/journalVideoRecordingRecovery";
import { enqueueFinalizedJournalVideoCaptureForRecovery } from "@/lib/journal/journalVideoUploadQueue";
import {
  buildJournalVideoFinalizationSummary,
  checkpointJournalVideoRecorders,
  createJournalVideoChunkWriteCoordinator,
  createJournalVideoDataCheckpoint,
  JOURNAL_VIDEO_STOP_TIMEOUT_MS,
  journalVideoTracksCanResume,
  journalVideoWithTimeout,
  observeJournalVideoStreamTracks,
  requestPersistentJournalVideoStorage,
  stopJournalVideoRecorderWithFallback,
  sumJournalVideoBlobBytes,
  type JournalVideoCapturePhase,
  type JournalVideoCaptureResult,
  type JournalVideoDurableBackupState,
  type JournalVideoInterruptionReason,
  type JournalVideoRecoveryLifecyclePatch,
  type UseJournalVideoCaptureApi,
  type UseJournalVideoCaptureOptions,
} from "@/lib/journal/journalVideoCaptureLifecycle";
export type { JournalVideoCaptureMode };
export type {
  JournalVideoCapturePhase,
  JournalVideoCaptureResult,
  JournalVideoDurableBackupState,
  JournalVideoInterruptionReason,
  UseJournalVideoCaptureApi,
  UseJournalVideoCaptureOptions,
} from "@/lib/journal/journalVideoCaptureLifecycle";
function updateRecoveryLifecycle(
  id: string | null | undefined,
  patch: JournalVideoRecoveryLifecyclePatch,
): void {
  updateInProgressJournalVideoRecording(id, patch);
}
export function useJournalVideoCapture(
  options: UseJournalVideoCaptureOptions = {},
): UseJournalVideoCaptureApi {
  const { onInterim, language, onScreenShareEnded, onMaxDuration, settings: settingsProp } =
    options;
  const onInterimRef = useRef(onInterim);
  const onScreenShareEndedRef = useRef(onScreenShareEnded);
  const onMaxDurationRef = useRef(onMaxDuration);
  const recoveryOptionsRef = useRef(options.recovery);
  onInterimRef.current = onInterim;
  onScreenShareEndedRef.current = onScreenShareEnded;
  onMaxDurationRef.current = onMaxDuration;
  recoveryOptionsRef.current = options.recovery;
  const supported = journalVideoCaptureSupported();
  const [mode, setMode] = useState<JournalVideoCaptureMode | null>(null);
  const [phase, setPhase] = useState<JournalVideoCapturePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [recordingBytes, setRecordingBytes] = useState(0);
  const [facingMode, setFacingMode] = useState<CameraFacing>("user");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [audioDeviceId, setAudioDeviceId] = useState<string | null>(
    () => readJournalVideoCaptureSettings().audioDeviceId,
  );
  const [chapters, setChapters] = useState<JournalVideoChapter[]>([]);
  const [settings, setSettings] = useState<JournalVideoCaptureSettings>(
    () => settingsProp ?? readJournalVideoCaptureSettings(),
  );
  const [screenUsesCameraAudio, setScreenUsesCameraAudio] = useState(true);
  const [durableBackupState, setDurableBackupState] =
    useState<JournalVideoDurableBackupState>("idle");
  const [durableBackupError, setDurableBackupError] = useState<string | null>(null);
  const [interruptionReason, setInterruptionReason] =
    useState<JournalVideoInterruptionReason | null>(null);
  const [canResume, setCanResume] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const streamRef = useRef<MediaStream | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const compositeSessionRef = useRef<ScreenCompositeSession | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const resolveStopRef = useRef<((result: Blob | null) => void) | null>(null);
  const resolveAudioStopRef = useRef<((blob: Blob | null) => void) | null>(null);
  const finalizedTranscriptRef = useRef("");
  const interimPartialRef = useRef("");
  const peakLiveTranscriptRef = useRef("");
  const chaptersRef = useRef<JournalVideoChapter[]>([]);
  const lastSpeechFinalRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRecoveryHeartbeatAtRef = useRef(0);
  const recordingStartedAtRef = useRef<number | null>(null);
  const pausedAccumMsRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const maxDurationTriggeredRef = useRef(false);
  const recoveryDraftIdRef = useRef<string | null>(null);
  const videoChunkIndexRef = useRef(0);
  const audioChunkIndexRef = useRef(0);
  const stopRecordingRef = useRef<(() => Promise<JournalVideoCaptureResult | null>) | null>(null);
  const stopPromiseRef = useRef<Promise<JournalVideoCaptureResult | null> | null>(null);
  const finalResultRef = useRef<JournalVideoCaptureResult | null>(null);
  const stopRequestedRef = useRef(false);
  const releaseRequestedRef = useRef(false);
  const releasePromotionIdsRef = useRef(new Set<string>());
  const latchedVideoBlobRef = useRef<Blob | null>(null);
  const latchedAudioBlobRef = useRef<Blob | null>(null);
  const videoMimeTypeRef = useRef("");
  const audioMimeTypeRef = useRef("");
  const persistenceErrorRef = useRef<string | null>(null);
  const dataCheckpointRef = useRef(createJournalVideoDataCheckpoint());
  const chunkWriterRef = useRef(
    createJournalVideoChunkWriteCoordinator(() => undefined),
  );
  const interruptionReasonRef = useRef<JournalVideoInterruptionReason | null>(null);
  const mountedRef = useRef(true);
  const ownerIdRef = useRef(createJournalVideoRecoveryId());
  const streamTrackCleanupRef = useRef<(() => void) | null>(null);
  const trackEndedHandlerRef = useRef<() => void>(() => {});
  const facingRef = useRef<CameraFacing>("user");
  const deviceIdRef = useRef<string | null>(null);
  const audioDeviceIdRef = useRef<string | null>(audioDeviceId);
  const phaseRef = useRef<JournalVideoCapturePhase>(phase);
  facingRef.current = facingMode;
  deviceIdRef.current = deviceId;
  audioDeviceIdRef.current = audioDeviceId;
  phaseRef.current = phase;
  const setInterruption = useCallback((reason: JournalVideoInterruptionReason | null) => {
    interruptionReasonRef.current = reason;
    if (mountedRef.current) setInterruptionReason(reason);
  }, []);
  const markPersistenceAtRisk = useCallback((error: unknown, recoveryId = recoveryDraftIdRef.current) => {
    const message = error instanceof Error ? error.message : String(error);
    persistenceErrorRef.current = message;
    if (mountedRef.current) {
      setDurableBackupError(message);
      setDurableBackupState("at-risk");
    }
    updateRecoveryLifecycle(recoveryId, {
      status: "failed",
      persistenceError: message,
      heartbeatAt: new Date().toISOString(),
    });
  }, []);
  const promoteFinalizedCaptureForRelease = useCallback(
    (result: JournalVideoCaptureResult) => {
      const id = result.recoveryDraftId;
      if (!id || releasePromotionIdsRef.current.has(id)) return;
      const storedRecovery = listInProgressJournalVideoRecordings().find((row) => row.id === id);
      const options = recoveryOptionsRef.current;
      // A missing recovery row normally means the durable queue already took
      // ownership. Synthesize one only when capture persistence itself failed.
      const recovery =
        storedRecovery ??
        (options && persistenceErrorRef.current
          ? {
              id,
              userId: options.userId,
              entryId: options.entryId,
              anchorOffset: options.anchorOffset,
              durationMs: result.durationMs,
              startedAt: new Date().toISOString(),
            }
          : null);
      if (!recovery) {
        setJournalVideoRecordingActiveInPage(id, false);
        return;
      }
      releasePromotionIdsRef.current.add(id);
      void enqueueFinalizedJournalVideoCaptureForRecovery(result, recovery)
        .then(() => clearInProgressJournalVideoRecording(id))
        .catch((error) => markPersistenceAtRisk(error, id))
        .finally(() => setJournalVideoRecordingActiveInPage(id, false));
    },
    [markPersistenceAtRisk],
  );
  const syncLiveTranscriptDisplay = useCallback(() => {
    const combined = composeVideoLiveTranscript(
      finalizedTranscriptRef.current,
      interimPartialRef.current,
    );
    if (combined.length > peakLiveTranscriptRef.current.length) {
      peakLiveTranscriptRef.current = combined;
    }
    updateInProgressJournalVideoRecording(recoveryDraftIdRef.current, {
      liveTranscript: combined,
      peakLiveTranscript: peakLiveTranscriptRef.current,
    });
    setInterim(combined);
    onInterimRef.current?.(combined);
  }, []);
  const handleInterim = useCallback(
    (partial: string) => {
      interimPartialRef.current = partial;
      syncLiveTranscriptDisplay();
    },
    [syncLiveTranscriptDisplay],
  );
  const speech = useSpeechDictation({
    onAppend: (chunk) => {
      const { text, lastFinal } = appendVideoSpeechFinal(
        finalizedTranscriptRef.current,
        chunk,
        lastSpeechFinalRef.current,
      );
      finalizedTranscriptRef.current = text;
      lastSpeechFinalRef.current = lastFinal;
      syncLiveTranscriptDisplay();
    },
    onInterim: handleInterim,
    language,
    skipMicPermissionProbe: true,
  });
  const speechStopRef = useRef(speech.stop);
  speechStopRef.current = speech.stop;
  const speechStartRef = useRef(speech.start);
  speechStartRef.current = speech.start;
  const speechListeningRef = useRef(false);
  speechListeningRef.current = speech.listening;
  const speechSupportedRef = useRef(speech.supported);
  speechSupportedRef.current = speech.supported;
  const openGenRef = useRef(0);
  const clearRecordingTick = useCallback(() => {
    if (recordingTickRef.current) {
      clearInterval(recordingTickRef.current);
      recordingTickRef.current = null;
    }
  }, []);
  const getRecordingElapsedMs = useCallback(() => {
    const started = recordingStartedAtRef.current;
    if (started == null) return 0;
    const pausedNow = pauseStartedAtRef.current ? Date.now() - pauseStartedAtRef.current : 0;
    return Math.max(0, Date.now() - started - pausedAccumMsRef.current - pausedNow);
  }, []);
  const resetRecordingClock = useCallback(() => {
    clearRecordingTick();
    recordingStartedAtRef.current = null;
    pausedAccumMsRef.current = 0;
    pauseStartedAtRef.current = null;
    maxDurationTriggeredRef.current = false;
    setRecordingElapsedMs(0);
    setRecordingBytes(0);
  }, [clearRecordingTick]);
  const syncRecordingBytes = useCallback(() => {
    const bytes = sumJournalVideoBytes(chunksRef.current);
    setRecordingBytes(bytes);
    return bytes;
  }, []);
  const checkpointMedia = useCallback(
    async (reason?: JournalVideoInterruptionReason) => {
      const recoveryId = recoveryDraftIdRef.current;
      if (mountedRef.current) {
        setDurableBackupError(null);
        setDurableBackupState("saving");
      }
      const checkpoint = await checkpointJournalVideoRecorders(
        dataCheckpointRef.current,
        chunkWriterRef.current,
        recorderRef.current,
        audioRecorderRef.current,
      );
      if (!checkpoint.writesSettled) {
        if (checkpoint.error) markPersistenceAtRisk(checkpoint.error);
        else if (mountedRef.current) {
          setDurableBackupState("at-risk");
          setDurableBackupError("The local backup is still finishing. Keep this recorder open.");
        }
        return false;
      }
      const videoBytes = sumJournalVideoBlobBytes(chunksRef.current);
      const audioBytes = sumJournalVideoBlobBytes(audioChunksRef.current);
      const hasDurableMedia = videoBytes > 0 || audioBytes > 0;
      if (mountedRef.current) {
        setDurableBackupState(hasDurableMedia ? "saved" : checkpoint.requested ? "at-risk" : "idle");
        setDurableBackupError(
          hasDurableMedia || !checkpoint.requested
            ? null
            : "The browser has not released a backup segment yet. Keep this recorder open.",
        );
      }
      updateRecoveryLifecycle(recoveryId, {
        status: phaseRef.current === "recording" ? "recording" : "paused",
        heartbeatAt: new Date().toISOString(),
        ...(reason ? { interruptionReason: reason } : {}),
        videoBytes,
        audioBytes,
      });
      return hasDurableMedia;
    },
    [markPersistenceAtRisk],
  );
  const startRecordingTick = useCallback(() => {
    clearRecordingTick();
    recordingTickRef.current = setInterval(() => {
      const elapsed = getRecordingElapsedMs();
      const bytes = syncRecordingBytes();
      if (Date.now() - lastRecoveryHeartbeatAtRef.current >= 1_000) {
        lastRecoveryHeartbeatAtRef.current = Date.now();
        updateInProgressJournalVideoRecording(recoveryDraftIdRef.current, {
          durationMs: elapsed,
          chapters: chaptersRef.current,
        });
        updateRecoveryLifecycle(recoveryDraftIdRef.current, {
          status: phaseRef.current === "paused" ? "paused" : "recording",
          heartbeatAt: new Date().toISOString(),
          videoBytes: bytes,
          audioBytes: sumJournalVideoBlobBytes(audioChunksRef.current),
        });
      }
      setRecordingElapsedMs(elapsed);
      if (
        shouldStopJournalVideoRecording(bytes, elapsed) &&
        !maxDurationTriggeredRef.current &&
        recorderRef.current?.state === "recording"
      ) {
        maxDurationTriggeredRef.current = true;
        onMaxDurationRef.current?.();
        void stopRecordingRef.current?.();
      }
    }, 250);
  }, [clearRecordingTick, getRecordingElapsedMs, syncRecordingBytes]);
  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }, []);
  const watchStreamTracks = useCallback((stream: MediaStream | null) => {
    streamTrackCleanupRef.current?.();
    streamTrackCleanupRef.current = null;
    if (!stream) return;
    streamTrackCleanupRef.current = observeJournalVideoStreamTracks(
      stream,
      (track) => Boolean(streamRef.current?.getTracks().includes(track)),
      () => trackEndedHandlerRef.current(),
    );
  }, []);
  const cleanupStream = useCallback((preserveCaptureData = false) => {
    streamTrackCleanupRef.current?.();
    streamTrackCleanupRef.current = null;
    compositeSessionRef.current?.stop();
    compositeSessionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPreviewStream(null);
    if (videoElRef.current) videoElRef.current.srcObject = null;
    recorderRef.current = null;
    audioRecorderRef.current = null;
    if (!preserveCaptureData) {
      chunksRef.current = [];
      audioChunksRef.current = [];
    }
  }, []);
  const syncPreviewPlayback = useCallback((el: HTMLVideoElement | null = videoElRef.current) => {
    if (!el || !streamRef.current) return;
    if (phaseRef.current === "paused") {
      el.pause();
      return;
    }
    void el.play().catch(() => {});
  }, []);
  const bindPreview = useCallback(
    (el: HTMLVideoElement | null) => {
      videoElRef.current = el;
      if (el && streamRef.current) {
        el.srcObject = streamRef.current;
        syncPreviewPlayback(el);
      }
    },
    [syncPreviewPlayback],
  );
  const attachPreviewStream = useCallback(
    (stream: MediaStream) => {
      watchStreamTracks(stream);
      streamRef.current = stream;
      setPreviewStream(stream);
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
        syncPreviewPlayback(videoElRef.current);
      }
    },
    [syncPreviewPlayback, watchStreamTracks],
  );
  const liveDeviceRefs = useRef({
    streamRef,
    phaseRef,
    settingsRef,
    facingRef,
    deviceIdRef,
    audioDeviceIdRef,
    audioRecorderRef,
    audioChunksRef,
    audioChunkIndexRef,
    recoveryDraftIdRef,
    resolveAudioStopRef,
  });
  liveDeviceRefs.current = {
    streamRef,
    phaseRef,
    settingsRef,
    facingRef,
    deviceIdRef,
    audioDeviceIdRef,
    audioRecorderRef,
    audioChunksRef,
    audioChunkIndexRef,
    recoveryDraftIdRef,
    resolveAudioStopRef,
  };
  const restartAudioSidecar = useCallback(() => {
    restartJournalVideoAudioSidecar(liveDeviceRefs.current);
  }, []);
  const notifyStreamUpdated = useCallback(
    (stream: MediaStream) => {
      watchStreamTracks(stream);
      setPreviewStream(stream);
    },
    [watchStreamTracks],
  );

  const acquireStream = useCallback(
    async (captureMode: JournalVideoCaptureMode, gen: number) => {
      const s = settingsRef.current;
      let stream: MediaStream;
      if (captureMode === "screen") {
        const session = await createScreenCompositeSession({
          onScreenShareEnded: () => {
            onScreenShareEndedRef.current?.();
            void stopRecordingRef.current?.();
          },
          includeSystemAudio: s.includeSystemAudio,
          cameraOptions: {
            quality: s.quality,
            facingMode: facingRef.current,
            deviceId: deviceIdRef.current,
            audioDeviceId: audioDeviceIdRef.current,
          },
          initialBubble: {
            corner: s.bubbleCorner,
            size: s.bubbleSize,
            visible: s.bubbleVisible,
          },
        });
        if (gen !== openGenRef.current) {
          session.stop();
          return null;
        }
        compositeSessionRef.current = session;
        stream = session.compositeStream;
        setScreenUsesCameraAudio(session.usesCameraAudio);
      } else {
        setScreenUsesCameraAudio(true);
        stream = await navigator.mediaDevices.getUserMedia(
          buildJournalVideoConstraints({
            quality: s.quality,
            facingMode: facingRef.current,
            deviceId: deviceIdRef.current,
            audioDeviceId: audioDeviceIdRef.current,
          }),
        );
        await tuneJournalVideoStream(stream, s.quality);
        if (gen !== openGenRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return null;
        }
      }
      return stream;
    },
    [],
  );

  const flushRecoveryTranscript = useCallback(() => {
    const id = recoveryDraftIdRef.current;
    if (!id) return;
    const liveTranscript = composeVideoLiveTranscript(
      finalizedTranscriptRef.current,
      interimPartialRef.current,
    );
    if (liveTranscript.length > peakLiveTranscriptRef.current.length) {
      peakLiveTranscriptRef.current = liveTranscript;
    }
    updateInProgressJournalVideoRecording(id, {
      liveTranscript,
      peakLiveTranscript: peakLiveTranscriptRef.current,
      durationMs: getRecordingElapsedMs(),
      chapters: chaptersRef.current,
    });
  }, [getRecordingElapsedMs]);

  /** Persist peak captions into the entry body so a reload can't erase spoken words. */
  const persistRecoveryTranscriptToEntry = useCallback(() => {
    const recovery = recoveryOptionsRef.current;
    const id = recoveryDraftIdRef.current;
    const text = pickBestVideoJournalTranscript(
      peakLiveTranscriptRef.current,
      composeVideoLiveTranscript(finalizedTranscriptRef.current, interimPartialRef.current),
    ).trim();
    if (!recovery || !id || !text) return;
    const meta = listInProgressJournalVideoRecordings().find((row) => row.id === id);
    const snap = bodySnapFromMeta(meta?.bodySnapBody, meta?.bodySnapAnchor);
    void persistVideoJournalTranscriptToEntry(
      recovery.userId,
      recovery.entryId,
      text,
      meta?.bodySnapAnchor ?? recovery.anchorOffset,
      snap,
    ).catch((e) => {
      console.warn("[journal-video] pause transcript persist failed:", e);
    });
  }, []);

  const releaseCapture = useCallback(() => {
    const currentPhase = phaseRef.current;
    const finalized = finalResultRef.current;
    if (recoveryDraftIdRef.current && finalized) {
      releaseRequestedRef.current = true;
      promoteFinalizedCaptureForRelease(finalized);
      resetRecordingClock();
      cleanupStream();
      phaseRef.current = "idle";
      return;
    }
    const hasRecording =
      currentPhase === "recording" ||
      currentPhase === "paused" ||
      currentPhase === "processing" ||
      Boolean(recorderRef.current && recorderRef.current.state !== "inactive") ||
      chunksRef.current.length > 0;

    openGenRef.current += 1;
    clearCountdown();
    speechStopRef.current();

    if (recoveryDraftIdRef.current && hasRecording) {
      releaseRequestedRef.current = true;
      setInterruption("unmounted");
      flushRecoveryTranscript();
      persistRecoveryTranscriptToEntry();
      updateRecoveryLifecycle(recoveryDraftIdRef.current, {
        status: "finalizing",
        interruptionReason: "unmounted",
        heartbeatAt: new Date().toISOString(),
      });
      // stopRecording owns final event ordering and only clears volatile chunks
      // after queued dataavailable writes have settled (or hit a bounded timeout).
      void stopRecordingRef.current?.();
      return;
    }

    resetRecordingClock();
    cleanupStream();
    phaseRef.current = "idle";
    if (mountedRef.current) {
      setMode(null);
      setPhase("idle");
    }
  }, [
    cleanupStream,
    clearCountdown,
    flushRecoveryTranscript,
    persistRecoveryTranscriptToEntry,
    promoteFinalizedCaptureForRelease,
    resetRecordingClock,
    setInterruption,
  ]);
  const releaseCaptureRefForUnmount = useRef(releaseCapture);
  releaseCaptureRefForUnmount.current = releaseCapture;
  const cancel = useCallback(() => {
    const id = recoveryDraftIdRef.current;
    stopRequestedRef.current = true;
    const recorders = [recorderRef.current, audioRecorderRef.current];
    for (const recorder of recorders) {
      if (!recorder) continue;
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* Explicit discard is best-effort cleanup. */
        }
      }
    }
    resolveStopRef.current?.(null);
    resolveStopRef.current = null;
    resolveAudioStopRef.current?.(null);
    resolveAudioStopRef.current = null;
    stopPromiseRef.current = null;
    finalResultRef.current = null;
    releaseRequestedRef.current = false;
    setJournalVideoRecordingActiveInPage(id, false);
    recoveryDraftIdRef.current = null;
    videoChunkIndexRef.current = 0;
    audioChunkIndexRef.current = 0;
    clearCountdown();
    resetRecordingClock();
    speechStopRef.current();
    cleanupStream();
    phaseRef.current = "idle";
    setInterruption(null);
    if (mountedRef.current) {
      setMode(null);
      setPhase("idle");
      setChapters([]);
      setInterim("");
      setDurableBackupState("idle");
      setDurableBackupError(null);
      setCanResume(false);
    }
    finalizedTranscriptRef.current = "";
    interimPartialRef.current = "";
    peakLiveTranscriptRef.current = "";
    chaptersRef.current = [];
    lastSpeechFinalRef.current = { text: "", at: 0 };
    onInterimRef.current?.("");
    void clearInProgressJournalVideoRecording(id);
  }, [cleanupStream, clearCountdown, resetRecordingClock, setInterruption]);

  const openPreview = useCallback(
    async (captureMode: JournalVideoCaptureMode) => {
      if (!supported) {
        setError("Video recording isn't supported in this browser.");
        return;
      }
      const gen = ++openGenRef.current;
      setMode(captureMode);
      setError(null);
      setDurableBackupState("idle");
      setDurableBackupError(null);
      setCanResume(false);
      setInterruption(null);
      setPhase("idle");
      stopPromiseRef.current = null;
      finalResultRef.current = null;
      stopRequestedRef.current = false;
      releaseRequestedRef.current = false;
      latchedVideoBlobRef.current = null;
      latchedAudioBlobRef.current = null;
      persistenceErrorRef.current = null;
      dataCheckpointRef.current = createJournalVideoDataCheckpoint();
      chunkWriterRef.current = createJournalVideoChunkWriteCoordinator(markPersistenceAtRisk);
      finalizedTranscriptRef.current = "";
      interimPartialRef.current = "";
      chaptersRef.current = [];
      setChapters([]);
      setInterim("");
      clearCountdown();
      try {
        cleanupStream();
        const stream = await acquireStream(captureMode, gen);
        if (!stream) return;
        attachPreviewStream(stream);
        setPhase("preview");
      } catch (e) {
        if (gen !== openGenRef.current) return;
        cleanupStream();
        setMode(null);
        setPhase("idle");
        const err = e instanceof Error ? e : new Error(String(e));
        if (err.name === "NotAllowedError") {
          setError(
            captureMode === "screen"
              ? "Screen or camera access was blocked. Tap Allow when prompted, or check Settings → Safari → Camera/Microphone for this site."
              : "Camera or microphone access was blocked. Tap Allow when prompted, or check Settings → Safari → Camera/Microphone for this site.",
          );
        } else if (err.name === "NotFoundError") {
          setError("No camera or screen source was found.");
        } else {
          setError(
            captureMode === "screen" ? "Could not start screen recording." : "Could not access the camera.",
          );
        }
      }
    },
    [
      supported,
      cleanupStream,
      clearCountdown,
      acquireStream,
      attachPreviewStream,
      markPersistenceAtRisk,
      setInterruption,
    ],
  );

  const startRecording = useCallback(() => {
    requestPersistentJournalVideoStorage();
    const failToPreview = (message: string) => {
      clearCountdown();
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      recorderRef.current = null;
      try {
        if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
          audioRecorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      audioRecorderRef.current = null;
      phaseRef.current = "preview";
      setPhase("preview");
      setError(message);
    };
    try {
      const stream = streamRef.current;
      const currentPhase = phaseRef.current;
      if (currentPhase !== "preview" && currentPhase !== "countdown") {
        return;
      }
      if (!stream) {
        failToPreview("Camera stream was lost. Tap Start countdown to try again.");
        return;
      }

      clearCountdown();
      setError(null);

      const created = createJournalVideoMediaRecorder(stream);
      if (!created) {
        failToPreview(
          "Video recording isn't supported in this browser. On iPad, try an updated Safari or Chrome.",
        );
        return;
      }

      const { recorder: rec, mimeType: mime } = created;
      const videoMimeType = rec.mimeType || mime;
      videoMimeTypeRef.current = videoMimeType;
      audioMimeTypeRef.current = "";
      latchedVideoBlobRef.current = null;
      latchedAudioBlobRef.current = null;
      finalResultRef.current = null;
      stopPromiseRef.current = null;
      stopRequestedRef.current = false;
      persistenceErrorRef.current = null;
      setDurableBackupState("idle");
      setDurableBackupError(null);
      setInterruption(null);
      setCanResume(true);

      finalizedTranscriptRef.current = "";
      interimPartialRef.current = "";
      peakLiveTranscriptRef.current = "";
      chaptersRef.current = [];
      lastSpeechFinalRef.current = { text: "", at: 0 };
      setChapters([]);
      setInterim("");
      const videoChunks: Blob[] = [];
      const audioChunks: Blob[] = [];
      const dataCheckpoint = dataCheckpointRef.current;
      chunksRef.current = videoChunks;
      audioChunksRef.current = audioChunks;

      const recoveryId = options.recovery ? createJournalVideoRecoveryId() : null;
      const chunkWriter = createJournalVideoChunkWriteCoordinator((error) =>
        markPersistenceAtRisk(error, recoveryId),
      );
      chunkWriterRef.current = chunkWriter;
      recoveryDraftIdRef.current = recoveryId;
      videoChunkIndexRef.current = 0;
      audioChunkIndexRef.current = 0;
      if (recoveryId && options.recovery) {
        try {
          startInProgressJournalVideoRecording({
            id: recoveryId,
            userId: options.recovery.userId,
            entryId: options.recovery.entryId,
            anchorOffset: options.recovery.anchorOffset,
            durationMs: 0,
            liveTranscript: "",
            peakLiveTranscript: "",
            videoMimeType,
            audioMimeType: null,
            chapters: [],
          });
          setJournalVideoRecordingActiveInPage(recoveryId, true);
          updateRecoveryLifecycle(recoveryId, {
            status: "recording",
            ownerId: ownerIdRef.current,
            heartbeatAt: new Date().toISOString(),
            videoBytes: 0,
            audioBytes: 0,
          });
        } catch (error) {
          markPersistenceAtRisk(error, recoveryId);
        }
      }
      let videoChunkIndex = 0;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunks.push(e.data);
          const index = videoChunkIndex;
          videoChunkIndex += 1;
          videoChunkIndexRef.current = videoChunkIndex;
          if (recoveryId) {
            chunkWriter.enqueue("video", () =>
              appendInProgressJournalVideoRecordingChunk(recoveryId, "video", index, e.data),
            );
          }
          syncRecordingBytes();
        }
        dataCheckpoint.notify("video");
      };
      rec.onstop = () => {
        const blob = new Blob(videoChunks, { type: videoMimeType });
        const usableBlob = blob.size > 0 ? blob : null;
        if (recorderRef.current === rec) {
          latchedVideoBlobRef.current = usableBlob;
          resolveStopRef.current?.(usableBlob);
          resolveStopRef.current = null;
          if (
            !stopRequestedRef.current &&
            (phaseRef.current === "recording" || phaseRef.current === "paused")
          ) {
            phaseRef.current = "paused";
            setInterruption("recorder-stopped");
            if (mountedRef.current) {
              setPhase("paused");
              setCanResume(false);
            }
            speechStopRef.current();
            setJournalVideoStreamAudioEnabled(streamRef.current, false);
            updateRecoveryLifecycle(recoveryId, {
              status: "finalizing",
              interruptionReason: "recorder-stopped",
              heartbeatAt: new Date().toISOString(),
              videoBytes: blob.size,
            });
            void chunkWriter
              .drain()
              .then(() => {
                if (mountedRef.current) setDurableBackupState(blob.size > 0 ? "saved" : "at-risk");
                updateRecoveryLifecycle(recoveryId, {
                  status: "finalizing",
                  heartbeatAt: new Date().toISOString(),
                  videoBytes: blob.size,
                });
              })
              .catch((error) => markPersistenceAtRisk(error, recoveryId));
          }
        }
      };
      rec.onerror = () => {
        setInterruption("unknown");
        if (mountedRef.current) {
          setError("Recording was interrupted. Save this part before trying again.");
          setCanResume(false);
        }
        updateRecoveryLifecycle(recoveryId, {
          status: "failed",
          interruptionReason: "unknown",
          heartbeatAt: new Date().toISOString(),
        });
      };

      try {
        startJournalMediaRecorder(rec);
      } catch {
        setJournalVideoRecordingActiveInPage(recoveryId, false);
        recoveryDraftIdRef.current = null;
        void clearInProgressJournalVideoRecording(recoveryId);
        failToPreview(
          "Couldn't start recording on this device. Update Safari, or try Chrome for iPad.",
        );
        return;
      }
      recorderRef.current = rec;

      // Sidecar is best-effort — Safari often rejects a second recorder on the same tracks.
      const sidecar = createJournalAudioSidecarRecorder(stream);
      if (sidecar) {
        const { recorder: audioRec, mimeType: audioMime } = sidecar;
        const resolvedAudioMime = audioRec.mimeType || audioMime;
        audioMimeTypeRef.current = resolvedAudioMime;
        let audioChunkIndex = 0;
        audioRec.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunks.push(e.data);
            const index = audioChunkIndex;
            audioChunkIndex += 1;
            audioChunkIndexRef.current = audioChunkIndex;
            if (recoveryId) {
              chunkWriter.enqueue("audio", () =>
                appendInProgressJournalVideoRecordingChunk(recoveryId, "audio", index, e.data),
              );
            }
          }
          dataCheckpoint.notify("audio");
        };
        audioRec.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: resolvedAudioMime });
          if (audioRecorderRef.current === audioRec) {
            latchedAudioBlobRef.current = audioBlob.size > 0 ? audioBlob : null;
            resolveAudioStopRef.current?.(latchedAudioBlobRef.current);
            resolveAudioStopRef.current = null;
          }
        };
        try {
          startJournalMediaRecorder(audioRec);
          audioRecorderRef.current = audioRec;
          updateInProgressJournalVideoRecording(recoveryDraftIdRef.current, {
            audioMimeType: resolvedAudioMime,
          });
        } catch {
          audioRecorderRef.current = null;
        }
      }

      recordingStartedAtRef.current = Date.now();
      lastRecoveryHeartbeatAtRef.current = 0;
      pausedAccumMsRef.current = 0;
      pauseStartedAtRef.current = null;
      maxDurationTriggeredRef.current = false;
      peakLiveTranscriptRef.current = "";
      setRecordingElapsedMs(0);
      setRecordingBytes(0);
      startRecordingTick();
      phaseRef.current = "recording";
      setPhase("recording");
      if (speechSupportedRef.current) {
        try {
          speechStartRef.current();
        } catch {
          /* live captions optional */
        }
      }
    } catch {
      failToPreview("Couldn't start recording. Tap Start countdown to try again.");
    }
  }, [
    clearCountdown,
    markPersistenceAtRisk,
    options.recovery,
    setInterruption,
    startRecordingTick,
    syncRecordingBytes,
  ]);

  const startRecordingRef = useRef(startRecording);
  startRecordingRef.current = startRecording;
  const beginCountdown = useCallback(() => {
    if (phaseRef.current !== "preview" || countdownTimerRef.current) return;
    const seconds = settingsRef.current.countdown;
    if (seconds <= 0) {
      startRecordingRef.current();
      return;
    }
    phaseRef.current = "countdown";
    setPhase("countdown");
    setCountdown(seconds);
    let n = seconds;
    countdownTimerRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearCountdown();
        startRecordingRef.current();
        return;
      }
      setCountdown(n);
    }, 1000);
  }, [clearCountdown]);
  const skipCountdown = useCallback(() => {
    if (phaseRef.current !== "countdown") return;
    clearCountdown();
    startRecordingRef.current();
  }, [clearCountdown]);
  const cancelCountdown = useCallback(() => {
    if (phaseRef.current !== "countdown") return;
    clearCountdown();
    phaseRef.current = "preview";
    setPhase("preview");
  }, [clearCountdown]);

  const captureCanResumeNow = useCallback(
    () =>
      recorderRef.current?.state === "paused" &&
      journalVideoTracksCanResume(streamRef.current),
    [],
  );

  const pauseRecording = useCallback((reason: JournalVideoInterruptionReason = "manual") => {
    const rec = recorderRef.current;
    if (!rec || phaseRef.current !== "recording" || rec.state !== "recording") return;
    try {
      // requestData queues a checkpoint before pause queues its state transition.
      void checkpointMedia(reason);
      rec.pause();
      const audioRec = audioRecorderRef.current;
      if (audioRec && audioRec.state === "recording") audioRec.pause();
      // Fully idle until Resume: stop captions, mute mic, freeze mirror.
      speechStopRef.current();
      setJournalVideoStreamAudioEnabled(streamRef.current, false);
      pauseStartedAtRef.current = Date.now();
      setRecordingElapsedMs(getRecordingElapsedMs());
      phaseRef.current = "paused";
      setPhase("paused");
      setInterruption(reason);
      setCanResume(captureCanResumeNow());
      syncPreviewPlayback();
      // Speech stop clears interim synchronously; flush peak captions + entry body
      // so a reload while paused still recovers the words.
      flushRecoveryTranscript();
      persistRecoveryTranscriptToEntry();
      updateRecoveryLifecycle(recoveryDraftIdRef.current, {
        status: "paused",
        interruptionReason: reason,
        heartbeatAt: new Date().toISOString(),
        videoBytes: sumJournalVideoBlobBytes(chunksRef.current),
        audioBytes: sumJournalVideoBlobBytes(audioChunksRef.current),
      });
    } catch {
      setError("Couldn't pause recording. Try stopping instead.");
      setCanResume(false);
    }
  }, [
    captureCanResumeNow,
    checkpointMedia,
    flushRecoveryTranscript,
    getRecordingElapsedMs,
    persistRecoveryTranscriptToEntry,
    setInterruption,
    syncPreviewPlayback,
  ]);

  const resumeRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (phaseRef.current !== "paused") return;
    if (!rec || !captureCanResumeNow()) {
      const hasEndedTrack = Boolean(
        streamRef.current?.getTracks().some((track) => track.readyState === "ended"),
      );
      const reason: JournalVideoInterruptionReason = hasEndedTrack
        ? "track-ended"
        : "recorder-stopped";
      setInterruption(reason);
      setCanResume(false);
      void checkpointMedia(reason);
      updateRecoveryLifecycle(recoveryDraftIdRef.current, {
        status: "finalizing",
        interruptionReason: reason,
        heartbeatAt: new Date().toISOString(),
      });
      return;
    }
    try {
      setJournalVideoStreamAudioEnabled(streamRef.current, true);
      rec.resume();
      const audioRec = audioRecorderRef.current;
      if (audioRec && audioRec.state === "paused") audioRec.resume();
      if (pauseStartedAtRef.current != null) {
        pausedAccumMsRef.current += Date.now() - pauseStartedAtRef.current;
        pauseStartedAtRef.current = null;
      }
      phaseRef.current = "recording";
      setPhase("recording");
      setInterruption(null);
      setCanResume(true);
      updateRecoveryLifecycle(recoveryDraftIdRef.current, {
        status: "recording",
        heartbeatAt: new Date().toISOString(),
        videoBytes: sumJournalVideoBlobBytes(chunksRef.current),
        audioBytes: sumJournalVideoBlobBytes(audioChunksRef.current),
      });
      syncPreviewPlayback();
      if (speechSupportedRef.current && !speechListeningRef.current) {
        speechStartRef.current();
      }
    } catch {
      setJournalVideoStreamAudioEnabled(streamRef.current, false);
      setInterruption("unknown");
      setCanResume(false);
      setError("Couldn't resume recording. Save this part before starting another.");
    }
  }, [captureCanResumeNow, checkpointMedia, setInterruption, syncPreviewPlayback]);

  const stopRecording = useCallback((): Promise<JournalVideoCaptureResult | null> => {
    if (finalResultRef.current) return Promise.resolve(finalResultRef.current);
    if (stopPromiseRef.current) return stopPromiseRef.current;

    const currentPhase = phaseRef.current;
    const hasSalvageableVideo =
      Boolean(latchedVideoBlobRef.current?.size) || chunksRef.current.some((chunk) => chunk.size > 0);
    if (
      currentPhase !== "recording" &&
      currentPhase !== "paused" &&
      currentPhase !== "processing" &&
      !hasSalvageableVideo
    ) {
      return Promise.resolve(null);
    }

    const promise = (async (): Promise<JournalVideoCaptureResult | null> => {
      stopRequestedRef.current = true;
      phaseRef.current = "processing";
      if (mountedRef.current) {
        setPhase("processing");
        setCanResume(false);
      }
      clearCountdown();
      clearRecordingTick();
      const durationMs = getRecordingElapsedMs();
      if (mountedRef.current) setRecordingElapsedMs(durationMs);
      const liveTranscript = composeVideoLiveTranscript(
        finalizedTranscriptRef.current,
        interimPartialRef.current,
      ).trim();
      const peakLiveTranscript = pickBestVideoJournalTranscript(
        peakLiveTranscriptRef.current,
        liveTranscript,
      );
      const recordedChapters = [...chaptersRef.current];
      const recoveryDraftId = recoveryDraftIdRef.current;
      updateInProgressJournalVideoRecording(recoveryDraftId, {
        durationMs,
        liveTranscript,
        peakLiveTranscript,
        chapters: recordedChapters,
      });
      updateRecoveryLifecycle(recoveryDraftId, {
        status: "finalizing",
        heartbeatAt: new Date().toISOString(),
        ...(interruptionReasonRef.current
          ? { interruptionReason: interruptionReasonRef.current }
          : {}),
      });
      speechStopRef.current();
      finalizedTranscriptRef.current = "";
      interimPartialRef.current = "";
      peakLiveTranscriptRef.current = "";
      if (mountedRef.current) setInterim("");

      const rec = recorderRef.current;
      const audioRec = audioRecorderRef.current;
      const videoChunks = chunksRef.current;
      const audioChunks = audioChunksRef.current;
      const chunkWriter = chunkWriterRef.current;
      const [videoStop, audioStop] = await Promise.all([
        stopJournalVideoRecorderWithFallback({
          recorder: rec,
          timeoutMs: JOURNAL_VIDEO_STOP_TIMEOUT_MS,
          mimeType: videoMimeTypeRef.current || rec?.mimeType || "video/webm",
          getLatchedBlob: () => latchedVideoBlobRef.current,
          getChunks: () => videoChunks,
          setResolver: (resolve) => {
            resolveStopRef.current = resolve;
          },
          requestStop: stopMediaRecorderWithFlush,
        }),
        stopJournalVideoRecorderWithFallback({
          recorder: audioRec,
          timeoutMs: JOURNAL_VIDEO_STOP_TIMEOUT_MS,
          mimeType: audioMimeTypeRef.current || audioRec?.mimeType,
          getLatchedBlob: () => latchedAudioBlobRef.current,
          getChunks: () => audioChunks,
          setResolver: (resolve) => {
            resolveAudioStopRef.current = resolve;
          },
          requestStop: stopMediaRecorderWithFlush,
        }),
      ]);
      let videoBlob = videoStop.blob;
      let audioBlob = audioStop.blob;
      const recordersSettled = videoStop.stopped && audioStop.stopped;
      const writesSettled =
        recordersSettled &&
        (await journalVideoWithTimeout(
          chunkWriter.drain().then(
            () => true,
            () => false,
          ),
          JOURNAL_VIDEO_STOP_TIMEOUT_MS,
          () => false,
        ));
      const updateFinalization = (
        nextVideoBlob: Blob | null,
        nextAudioBlob: Blob | null,
        stopped: boolean,
        persisted: boolean,
      ) => {
        const summary = buildJournalVideoFinalizationSummary({
          videoBlob: nextVideoBlob,
          audioBlob: nextAudioBlob,
          videoChunks,
          audioChunks,
          recordersStopped: stopped,
          writesPersisted: persisted,
          persistenceError: chunkWriter.getError(),
          now: new Date().toISOString(),
        });
        if (mountedRef.current) {
          setDurableBackupState(summary.ready ? "saved" : "at-risk");
          if (!summary.ready) {
            setDurableBackupError(
              chunkWriter.getError() ?? "The local backup is still finishing. Keep this tab open.",
            );
          }
        }
        updateRecoveryLifecycle(recoveryDraftId, summary.patch);
        if (releaseRequestedRef.current) {
          setJournalVideoRecordingActiveInPage(recoveryDraftId, false);
        }
        return summary.ready;
      };
      const ready = updateFinalization(videoBlob, audioBlob, recordersSettled, writesSettled);

      if (!recordersSettled) {
        void Promise.all([videoStop.completion, audioStop.completion])
          .then(async ([lateVideoBlob, lateAudioBlob]) => {
            if (recoveryDraftIdRef.current !== recoveryDraftId) return;
            videoBlob = lateVideoBlob ?? videoBlob;
            audioBlob = lateAudioBlob ?? audioBlob;
            const lateWritesSettled = await journalVideoWithTimeout(
              chunkWriter.drain().then(
                () => true,
                () => false,
              ),
              JOURNAL_VIDEO_STOP_TIMEOUT_MS,
              () => false,
            );
            const lateReady = updateFinalization(videoBlob, audioBlob, true, lateWritesSettled);
            if (
              recoveryDraftIdRef.current === recoveryDraftId &&
              recorderRef.current === rec
            ) {
              cleanupStream(!lateReady);
            }
          })
          .catch((error) => markPersistenceAtRisk(error, recoveryDraftId));
      } else {
        cleanupStream(!ready);
      }

      resetRecordingClock();
      phaseRef.current = "idle";
      chaptersRef.current = [];
      lastSpeechFinalRef.current = { text: "", at: 0 };
      if (mountedRef.current) {
        setMode(null);
        setPhase("idle");
        setChapters([]);
      }
      if (!videoBlob) return null;
      const result: JournalVideoCaptureResult = {
        video: videoBlob,
        audio: audioBlob,
        liveTranscript,
        peakLiveTranscript,
        chapters: recordedChapters,
        durationMs,
        recoveryDraftId,
      };
      finalResultRef.current = result;
      if (releaseRequestedRef.current) promoteFinalizedCaptureForRelease(result);
      return result;
    })();

    stopPromiseRef.current = promise;
    return promise;
  }, [
    cleanupStream,
    clearCountdown,
    clearRecordingTick,
    getRecordingElapsedMs,
    markPersistenceAtRisk,
    promoteFinalizedCaptureForRelease,
    resetRecordingClock,
  ]);

  stopRecordingRef.current = stopRecording;

  const markCaptureInterrupted = useCallback(
    (reason: JournalVideoInterruptionReason) => {
      const currentPhase = phaseRef.current;
      if (currentPhase !== "recording" && currentPhase !== "paused") return;
      const rec = recorderRef.current;
      if (currentPhase === "recording" && rec?.state === "recording") {
        pauseRecording(reason);
        return;
      }

      if (pauseStartedAtRef.current == null) pauseStartedAtRef.current = Date.now();
      phaseRef.current = "paused";
      setInterruption(reason);
      if (mountedRef.current) {
        setPhase("paused");
        setCanResume(captureCanResumeNow());
      }
      speechStopRef.current();
      setJournalVideoStreamAudioEnabled(streamRef.current, false);
      syncPreviewPlayback();
      flushRecoveryTranscript();
      persistRecoveryTranscriptToEntry();
      void checkpointMedia(reason);
      updateRecoveryLifecycle(recoveryDraftIdRef.current, {
        status: "paused",
        interruptionReason: reason,
        heartbeatAt: new Date().toISOString(),
      });
    },
    [
      captureCanResumeNow,
      checkpointMedia,
      flushRecoveryTranscript,
      pauseRecording,
      persistRecoveryTranscriptToEntry,
      setInterruption,
      syncPreviewPlayback,
    ],
  );

  trackEndedHandlerRef.current = () => markCaptureInterrupted("track-ended");

  const validateCaptureAfterReturn = useCallback(() => {
    const currentPhase = phaseRef.current;
    if (currentPhase !== "recording" && currentPhase !== "paused") return;
    const rec = recorderRef.current;
    const tracks = streamRef.current?.getTracks() ?? [];
    const hasEndedTrack = tracks.length === 0 || tracks.some((track) => track.readyState === "ended");
    if (!rec || rec.state === "inactive" || hasEndedTrack) {
      markCaptureInterrupted(hasEndedTrack ? "track-ended" : "recorder-stopped");
      if (mountedRef.current) setCanResume(false);
      return;
    }
    if (currentPhase === "paused") {
      if (mountedRef.current) setCanResume(captureCanResumeNow());
      syncPreviewPlayback();
    }
  }, [captureCanResumeNow, markCaptureInterrupted, syncPreviewPlayback]);

  const handleCapturePageHidden = useCallback(
    () => markCaptureInterrupted("background"),
    [markCaptureInterrupted],
  );
  useJournalVideoPageLifecycle(handleCapturePageHidden, validateCaptureAfterReturn);

  const swapCameraVideoTrack = useCallback(async () => {
    await swapJournalVideoCameraTrack(liveDeviceRefs.current, notifyStreamUpdated);
  }, [notifyStreamUpdated]);

  const swapCameraAudioTrack = useCallback(async () => {
    await swapJournalVideoAudioTrack(liveDeviceRefs.current, notifyStreamUpdated);
    restartAudioSidecar();
    if (phaseRef.current === "paused") {
      setJournalVideoStreamAudioEnabled(streamRef.current, false);
    }
  }, [notifyStreamUpdated, restartAudioSidecar]);

  const switchFacing = useCallback(async () => {
    if (mode !== "camera") return;
    const currentPhase = phaseRef.current;
    if (!canChangeJournalVideoDevices(currentPhase)) return;
    clearCountdown();
    const next = toggleCameraFacing(facingRef.current);
    setFacingMode(next);
    facingRef.current = next;
    setDeviceId(null);
    deviceIdRef.current = null;

    if (isJournalVideoLiveCapture(currentPhase)) {
      try {
        await swapCameraVideoTrack();
      } catch {
        setError("Could not switch camera.");
      }
      return;
    }

    const gen = ++openGenRef.current;
    try {
      cleanupStream();
      const stream = await acquireStream("camera", gen);
      if (!stream) return;
      attachPreviewStream(stream);
      setPhase("preview");
    } catch {
      setError("Could not switch camera.");
    }
  }, [mode, cleanupStream, acquireStream, clearCountdown, attachPreviewStream, swapCameraVideoTrack]);

  const selectDevice = useCallback(
    async (nextDeviceId: string) => {
      const currentPhase = phaseRef.current;
      if (!canChangeJournalVideoDevices(currentPhase)) return;
      clearCountdown();
      setDeviceId(nextDeviceId);
      deviceIdRef.current = nextDeviceId;

      if (mode === "screen") {
        const session = compositeSessionRef.current;
        if (!session) return;
        const s = settingsRef.current;
        try {
          await session.replaceCameraInput({
            quality: s.quality,
            deviceId: nextDeviceId,
            audioDeviceId: audioDeviceIdRef.current,
          });
          setPreviewStream(session.compositeStream);
        } catch {
          setError("Could not switch camera.");
        }
        return;
      }

      if (mode !== "camera") return;

      if (isJournalVideoLiveCapture(currentPhase)) {
        try {
          await swapCameraVideoTrack();
        } catch {
          setError("Could not switch camera.");
        }
        return;
      }

      const gen = ++openGenRef.current;
      try {
        cleanupStream();
        const stream = await acquireStream("camera", gen);
        if (!stream) return;
        attachPreviewStream(stream);
        setPhase("preview");
      } catch {
        setError("Could not switch camera.");
      }
    },
    [mode, cleanupStream, acquireStream, clearCountdown, attachPreviewStream, swapCameraVideoTrack],
  );

  const selectAudioDevice = useCallback(
    async (nextAudioDeviceId: string) => {
      const currentPhase = phaseRef.current;
      if (!canChangeJournalVideoDevices(currentPhase)) return;
      clearCountdown();
      setAudioDeviceId(nextAudioDeviceId);
      audioDeviceIdRef.current = nextAudioDeviceId;
      setSettings((prev) => ({ ...prev, audioDeviceId: nextAudioDeviceId }));

      if (mode === "screen") {
        const session = compositeSessionRef.current;
        if (!session?.usesCameraAudio) return;
        try {
          await session.replaceAudioInput(nextAudioDeviceId);
          setPreviewStream(session.compositeStream);
          if (isJournalVideoLiveCapture(currentPhase)) {
            restartAudioSidecar();
          }
          if (phaseRef.current === "paused") {
            setJournalVideoStreamAudioEnabled(streamRef.current, false);
          }
        } catch {
          setError("Could not switch microphone.");
        }
        return;
      }

      if (mode !== "camera") return;

      if (isJournalVideoLiveCapture(currentPhase)) {
        try {
          await swapCameraAudioTrack();
        } catch {
          setError("Could not switch microphone.");
        }
        return;
      }

      const gen = ++openGenRef.current;
      try {
        cleanupStream();
        const stream = await acquireStream("camera", gen);
        if (!stream) return;
        attachPreviewStream(stream);
        setPhase("preview");
      } catch {
        setError("Could not switch microphone.");
      }
    },
    [mode, cleanupStream, acquireStream, clearCountdown, attachPreviewStream, swapCameraAudioTrack, restartAudioSidecar],
  );

  const markChapter = useCallback(
    (label?: string) => {
      const currentPhase = phaseRef.current;
      if (currentPhase !== "recording" && currentPhase !== "paused") return null;
      const atMs = getRecordingElapsedMs();
      const chapter: JournalVideoChapter = {
        label: label?.trim() || formatChapterLabel(chaptersRef.current.length),
        atMs,
      };
      chaptersRef.current = [...chaptersRef.current, chapter];
      setChapters(chaptersRef.current);
      return chapter.label;
    },
    [getRecordingElapsedMs],
  );

  const setBubbleLayout = useCallback((layout: Partial<ScreenBubbleLayout>) => {
    compositeSessionRef.current?.setBubbleLayout(layout);
    setSettings((prev) => ({
      ...prev,
      ...(layout.corner != null ? { bubbleCorner: layout.corner } : {}),
      ...(layout.size != null ? { bubbleSize: layout.size } : {}),
      ...(layout.visible != null ? { bubbleVisible: layout.visible } : {}),
    }));
  }, []);

  const patchSettings = useCallback((patch: Partial<JournalVideoCaptureSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (settingsProp) setSettings(settingsProp);
  }, [settingsProp]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      releaseCaptureRefForUnmount.current();
      mountedRef.current = false;
    };
  }, []);

  return {
    supported,
    mode,
    phase,
    error,
    interim,
    countdown,
    recordingElapsedMs,
    recordingBytes,
    recordingRemainingMs: journalVideoEffectiveRemainingMs(recordingElapsedMs, recordingBytes),
    maxDurationMs: JOURNAL_VIDEO_MAX_DURATION_MS,
    previewStream,
    facingMode,
    deviceId,
    audioDeviceId,
    chapters,
    settings,
    screenUsesCameraAudio,
    durableBackupState,
    durableBackupError,
    interruptionReason,
    canResume,
    bindPreview,
    openPreview,
    beginCountdown,
    cancelCountdown,
    skipCountdown,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    releaseCapture,
    cancel,
    switchFacing,
    selectDevice,
    selectAudioDevice,
    markChapter,
    setBubbleLayout,
    patchSettings,
  };
}
