import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildJournalVideoConstraints,
  createJournalAudioSidecarRecorder,
  journalVideoCaptureSupported,
  pickJournalVideoMimeType,
  stopMediaRecorderWithFlush,
  tuneJournalVideoStream,
} from "@/lib/journal/videos";
import type { JournalVideoCaptureSettings } from "@/lib/journal/journalVideoCaptureSettings";
import { readJournalVideoCaptureSettings } from "@/lib/journal/journalVideoCaptureSettings";
import {
  formatChapterLabel,
  type JournalVideoChapter,
} from "@/lib/journal/journalVideoChapters";
import type { CameraFacing } from "@/lib/journal/journalVideoDevices";
import { toggleCameraFacing } from "@/lib/journal/journalVideoDevices";
import {
  JOURNAL_VIDEO_BITS_PER_SECOND,
  JOURNAL_VIDEO_MAX_DURATION_MS,
  JOURNAL_VIDEO_TARGET_BITS_PER_SECOND,
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
import { composeVideoLiveTranscript, appendVideoSpeechFinal, pickBestVideoJournalTranscript } from "@/lib/journal/journalVideoBody";

export type JournalVideoCapturePhase =
  | "idle"
  | "preview"
  | "countdown"
  | "recording"
  | "paused"
  | "processing";

export type { JournalVideoCaptureMode };

export type JournalVideoCaptureResult = {
  video: Blob;
  audio: Blob | null;
  liveTranscript: string;
  /** Longest live caption string seen during the session (handles speech during pauses). */
  peakLiveTranscript: string;
  chapters: JournalVideoChapter[];
  durationMs: number;
};

export interface UseJournalVideoCaptureOptions {
  onInterim?: (partial: string) => void;
  language?: string;
  onScreenShareEnded?: () => void;
  onMaxDuration?: () => void;
  settings?: JournalVideoCaptureSettings;
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
  facingMode: CameraFacing;
  deviceId: string | null;
  chapters: JournalVideoChapter[];
  settings: JournalVideoCaptureSettings;
  bindPreview: (el: HTMLVideoElement | null) => void;
  openPreview: (mode: JournalVideoCaptureMode) => Promise<void>;
  beginCountdown: () => void;
  skipCountdown: () => void;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<JournalVideoCaptureResult | null>;
  cancel: () => void;
  switchFacing: () => Promise<void>;
  selectDevice: (deviceId: string) => Promise<void>;
  markChapter: (label?: string) => void;
  setBubbleLayout: (layout: Partial<ScreenBubbleLayout>) => void;
  patchSettings: (patch: Partial<JournalVideoCaptureSettings>) => void;
}

export function useJournalVideoCapture(
  options: UseJournalVideoCaptureOptions = {},
): UseJournalVideoCaptureApi {
  const { onInterim, language, onScreenShareEnded, onMaxDuration, settings: settingsProp } =
    options;
  const onInterimRef = useRef(onInterim);
  const onScreenShareEndedRef = useRef(onScreenShareEnded);
  const onMaxDurationRef = useRef(onMaxDuration);
  onInterimRef.current = onInterim;
  onScreenShareEndedRef.current = onScreenShareEnded;
  onMaxDurationRef.current = onMaxDuration;

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
  const [chapters, setChapters] = useState<JournalVideoChapter[]>([]);
  const [settings, setSettings] = useState<JournalVideoCaptureSettings>(
    () => settingsProp ?? readJournalVideoCaptureSettings(),
  );

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
  const recordingStartedAtRef = useRef<number | null>(null);
  const pausedAccumMsRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const maxDurationTriggeredRef = useRef(false);
  const stopRecordingRef = useRef<(() => Promise<JournalVideoCaptureResult | null>) | null>(null);
  const facingRef = useRef<CameraFacing>("user");
  const deviceIdRef = useRef<string | null>(null);
  facingRef.current = facingMode;
  deviceIdRef.current = deviceId;

  const syncLiveTranscriptDisplay = useCallback(() => {
    const combined = composeVideoLiveTranscript(
      finalizedTranscriptRef.current,
      interimPartialRef.current,
    );
    if (combined.length > peakLiveTranscriptRef.current.length) {
      peakLiveTranscriptRef.current = combined;
    }
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

  const startRecordingTick = useCallback(() => {
    clearRecordingTick();
    recordingTickRef.current = setInterval(() => {
      const elapsed = getRecordingElapsedMs();
      const bytes = syncRecordingBytes();
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

  const cleanupStream = useCallback(() => {
    compositeSessionRef.current?.stop();
    compositeSessionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPreviewStream(null);
    if (videoElRef.current) videoElRef.current.srcObject = null;
    recorderRef.current = null;
    audioRecorderRef.current = null;
    chunksRef.current = [];
    audioChunksRef.current = [];
  }, []);

  const bindPreview = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      void el.play().catch(() => {});
    }
  }, []);

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
      } else {
        stream = await navigator.mediaDevices.getUserMedia(
          buildJournalVideoConstraints({
            quality: s.quality,
            facingMode: facingRef.current,
            deviceId: deviceIdRef.current,
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

  const cancel = useCallback(() => {
    openGenRef.current += 1;
    clearCountdown();
    resetRecordingClock();
    speechStopRef.current();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
      try {
        audioRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    resolveStopRef.current?.(null);
    resolveStopRef.current = null;
    resolveAudioStopRef.current?.(null);
    resolveAudioStopRef.current = null;
    cleanupStream();
    setMode(null);
    setPhase("idle");
    finalizedTranscriptRef.current = "";
    interimPartialRef.current = "";
    peakLiveTranscriptRef.current = "";
    chaptersRef.current = [];
    lastSpeechFinalRef.current = { text: "", at: 0 };
    setChapters([]);
    setInterim("");
    onInterimRef.current?.("");
  }, [cleanupStream, clearCountdown, resetRecordingClock]);

  const openPreview = useCallback(
    async (captureMode: JournalVideoCaptureMode) => {
      if (!supported) {
        setError("Video recording isn't supported in this browser.");
        return;
      }
      const gen = ++openGenRef.current;
      setMode(captureMode);
      setError(null);
      setPhase("idle");
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
        streamRef.current = stream;
        setPreviewStream(stream);
        if (videoElRef.current) {
          videoElRef.current.srcObject = stream;
          await videoElRef.current.play().catch(() => {});
        }
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
    [supported, cleanupStream, clearCountdown, acquireStream],
  );

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || (phase !== "preview" && phase !== "countdown")) return;
    const mime = pickJournalVideoMimeType();
    if (!mime) {
      setError("Video recording isn't supported in this browser.");
      return;
    }
    clearCountdown();
    setError(null);
    finalizedTranscriptRef.current = "";
    interimPartialRef.current = "";
    peakLiveTranscriptRef.current = "";
    chaptersRef.current = [];
    lastSpeechFinalRef.current = { text: "", at: 0 };
    setChapters([]);
    setInterim("");
    chunksRef.current = [];
    audioChunksRef.current = [];
    const recorderOptions: MediaRecorderOptions = { mimeType: mime };
    try {
      recorderOptions.bitsPerSecond = JOURNAL_VIDEO_TARGET_BITS_PER_SECOND;
      recorderOptions.videoBitsPerSecond = JOURNAL_VIDEO_BITS_PER_SECOND.video;
      recorderOptions.audioBitsPerSecond = JOURNAL_VIDEO_BITS_PER_SECOND.audio;
    } catch {
      /* optional */
    }
    const rec = new MediaRecorder(stream, recorderOptions);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
        syncRecordingBytes();
      }
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime });
      resolveStopRef.current?.(blob.size > 0 ? blob : null);
      resolveStopRef.current = null;
    };
    rec.start(250);
    recorderRef.current = rec;

    const sidecar = createJournalAudioSidecarRecorder(stream);
    if (sidecar) {
      const { recorder: audioRec, mimeType: audioMime } = sidecar;
      audioChunksRef.current = [];
      audioRec.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      audioRec.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: audioRec.mimeType || audioMime,
        });
        resolveAudioStopRef.current?.(audioBlob.size > 0 ? audioBlob : null);
        resolveAudioStopRef.current = null;
      };
      try {
        audioRec.start(250);
        audioRecorderRef.current = audioRec;
      } catch {
        audioRecorderRef.current = null;
      }
    }

    recordingStartedAtRef.current = Date.now();
    pausedAccumMsRef.current = 0;
    pauseStartedAtRef.current = null;
    maxDurationTriggeredRef.current = false;
    peakLiveTranscriptRef.current = "";
    setRecordingElapsedMs(0);
    setRecordingBytes(0);
    startRecordingTick();
    setPhase("recording");
    if (speechSupportedRef.current) speechStartRef.current();
  }, [phase, clearCountdown, startRecordingTick, syncRecordingBytes]);

  const beginCountdown = useCallback(() => {
    if (phase !== "preview" || countdownTimerRef.current) return;
    const seconds = settingsRef.current.countdown;
    if (seconds <= 0) {
      startRecording();
      return;
    }
    setPhase("countdown");
    setCountdown(seconds);
    let n = seconds;
    countdownTimerRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearCountdown();
        startRecording();
        return;
      }
      setCountdown(n);
    }, 1000);
  }, [phase, clearCountdown, startRecording]);

  const skipCountdown = useCallback(() => {
    if (phase !== "countdown") return;
    clearCountdown();
    startRecording();
  }, [phase, clearCountdown, startRecording]);

  const pauseRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || phase !== "recording" || rec.state !== "recording") return;
    try {
      rec.pause();
      const audioRec = audioRecorderRef.current;
      if (audioRec && audioRec.state === "recording") audioRec.pause();
      pauseStartedAtRef.current = Date.now();
      setRecordingElapsedMs(getRecordingElapsedMs());
      setPhase("paused");
    } catch {
      /* ignore */
    }
  }, [phase, getRecordingElapsedMs]);

  const resumeRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || phase !== "paused" || rec.state !== "paused") return;
    try {
      rec.resume();
      const audioRec = audioRecorderRef.current;
      if (audioRec && audioRec.state === "paused") audioRec.resume();
      if (pauseStartedAtRef.current != null) {
        pausedAccumMsRef.current += Date.now() - pauseStartedAtRef.current;
        pauseStartedAtRef.current = null;
      }
      setPhase("recording");
      if (speechSupportedRef.current && !speechListeningRef.current) {
        speechStartRef.current();
      }
    } catch {
      /* ignore */
    }
  }, [phase]);

  const stopRecording = useCallback(async (): Promise<JournalVideoCaptureResult | null> => {
    if (phase !== "recording" && phase !== "paused") return null;
    setPhase("processing");
    clearCountdown();
    clearRecordingTick();
    setRecordingElapsedMs(getRecordingElapsedMs());
    const durationMs = getRecordingElapsedMs();
    const liveTranscript = composeVideoLiveTranscript(
      finalizedTranscriptRef.current,
      interimPartialRef.current,
    ).trim();
    const peakLiveTranscript = pickBestVideoJournalTranscript(
      peakLiveTranscriptRef.current,
      liveTranscript,
    );
    const recordedChapters = [...chaptersRef.current];
    speechStopRef.current();
    finalizedTranscriptRef.current = "";
    interimPartialRef.current = "";
    peakLiveTranscriptRef.current = "";
    setInterim("");

    const rec = recorderRef.current;
    const audioRec = audioRecorderRef.current;
    const videoPromise = new Promise<Blob | null>((resolve) => {
      resolveStopRef.current = resolve;
    });
    const audioPromise = new Promise<Blob | null>((resolve) => {
      resolveAudioStopRef.current = resolve;
    });

    if (rec && rec.state !== "inactive") {
      if (!stopMediaRecorderWithFlush(rec)) {
        resolveStopRef.current?.(null);
        resolveStopRef.current = null;
      }
    } else {
      resolveStopRef.current?.(null);
      resolveStopRef.current = null;
    }

    if (audioRec && audioRec.state !== "inactive") {
      if (!stopMediaRecorderWithFlush(audioRec)) {
        resolveAudioStopRef.current?.(null);
        resolveAudioStopRef.current = null;
      }
    } else {
      resolveAudioStopRef.current?.(null);
      resolveAudioStopRef.current = null;
    }

    const [videoBlob, audioBlob] = await Promise.all([videoPromise, audioPromise]);
    cleanupStream();
    resetRecordingClock();
    setMode(null);
    setPhase("idle");
    chaptersRef.current = [];
    lastSpeechFinalRef.current = { text: "", at: 0 };
    setChapters([]);
    if (!videoBlob) return null;
    return {
      video: videoBlob,
      audio: audioBlob,
      liveTranscript,
      peakLiveTranscript,
      chapters: recordedChapters,
      durationMs,
    };
  }, [phase, cleanupStream, clearCountdown, clearRecordingTick, getRecordingElapsedMs, resetRecordingClock]);

  stopRecordingRef.current = stopRecording;

  const switchFacing = useCallback(async () => {
    if (mode !== "camera" || (phase !== "preview" && phase !== "countdown")) return;
    const next = toggleCameraFacing(facingRef.current);
    setFacingMode(next);
    facingRef.current = next;
    setDeviceId(null);
    deviceIdRef.current = null;
    const gen = ++openGenRef.current;
    try {
      cleanupStream();
      const stream = await acquireStream("camera", gen);
      if (!stream) return;
      streamRef.current = stream;
      setPreviewStream(stream);
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
        await videoElRef.current.play().catch(() => {});
      }
      setPhase("preview");
    } catch {
      setError("Could not switch camera.");
    }
  }, [mode, phase, cleanupStream, acquireStream]);

  const selectDevice = useCallback(
    async (nextDeviceId: string) => {
      if (mode !== "camera" || (phase !== "preview" && phase !== "countdown")) return;
      setDeviceId(nextDeviceId);
      deviceIdRef.current = nextDeviceId;
      const gen = ++openGenRef.current;
      try {
        cleanupStream();
        const stream = await acquireStream("camera", gen);
        if (!stream) return;
        streamRef.current = stream;
        setPreviewStream(stream);
        if (videoElRef.current) {
          videoElRef.current.srcObject = stream;
          await videoElRef.current.play().catch(() => {});
        }
        setPhase("preview");
      } catch {
        setError("Could not switch camera.");
      }
    },
    [mode, phase, cleanupStream, acquireStream],
  );

  const markChapter = useCallback(
    (label?: string) => {
      if (phase !== "recording" && phase !== "paused") return;
      const atMs = getRecordingElapsedMs();
      const chapter: JournalVideoChapter = {
        label: label?.trim() || formatChapterLabel(chaptersRef.current.length),
        atMs,
      };
      chaptersRef.current = [...chaptersRef.current, chapter];
      setChapters(chaptersRef.current);
    },
    [phase, getRecordingElapsedMs],
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
    return () => {
      openGenRef.current += 1;
      clearCountdown();
      clearRecordingTick();
      compositeSessionRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [clearCountdown, clearRecordingTick]);

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
    chapters,
    settings,
    bindPreview,
    openPreview,
    beginCountdown,
    skipCountdown,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancel,
    switchFacing,
    selectDevice,
    markChapter,
    setBubbleLayout,
    patchSettings,
  };
}
