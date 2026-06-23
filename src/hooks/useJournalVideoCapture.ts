import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildJournalVideoConstraints,
  journalVideoCaptureSupported,
  pickJournalVideoMimeType,
} from "@/lib/journal/videos";
import {
  JOURNAL_VIDEO_BITS_PER_SECOND,
  JOURNAL_VIDEO_MAX_DURATION_MS,
  journalVideoRemainingMs,
} from "@/lib/journal/journalVideoLimits";
import {
  createScreenCompositeSession,
  type JournalVideoCaptureMode,
  type ScreenCompositeSession,
} from "@/lib/journal/screenRecordingComposite";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";

export type JournalVideoCapturePhase =
  | "idle"
  | "preview"
  | "countdown"
  | "recording"
  | "paused"
  | "processing";

export type { JournalVideoCaptureMode };

export interface UseJournalVideoCaptureOptions {
  onInterim?: (partial: string) => void;
  language?: string;
  onScreenShareEnded?: () => void;
  /** Called when the 30-minute journal limit is reached (recording auto-stops). */
  onMaxDuration?: () => void;
}

export interface UseJournalVideoCaptureApi {
  supported: boolean;
  mode: JournalVideoCaptureMode | null;
  phase: JournalVideoCapturePhase;
  error: string | null;
  interim: string;
  countdown: number | null;
  recordingElapsedMs: number;
  recordingRemainingMs: number;
  maxDurationMs: number;
  bindPreview: (el: HTMLVideoElement | null) => void;
  openPreview: (mode: JournalVideoCaptureMode) => Promise<void>;
  beginCountdown: () => void;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  cancel: () => void;
}

export function useJournalVideoCapture(options: UseJournalVideoCaptureOptions = {}): UseJournalVideoCaptureApi {
  const { onInterim, language, onScreenShareEnded, onMaxDuration } = options;
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

  const streamRef = useRef<MediaStream | null>(null);
  const compositeSessionRef = useRef<ScreenCompositeSession | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);
  const interimRef = useRef("");
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const pausedAccumMsRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const maxDurationTriggeredRef = useRef(false);
  const stopRecordingRef = useRef<(() => Promise<Blob | null>) | null>(null);

  const handleInterim = useCallback((text: string) => {
    interimRef.current = text;
    setInterim(text);
    onInterimRef.current?.(text);
  }, []);

  const speech = useSpeechDictation({
    onAppend: (chunk) => {
      interimRef.current = `${interimRef.current}${chunk}`.trim();
      setInterim(interimRef.current);
      onInterimRef.current?.(interimRef.current);
    },
    onInterim: handleInterim,
    language,
  });
  const speechStopRef = useRef(speech.stop);
  speechStopRef.current = speech.stop;
  const speechStartRef = useRef(speech.start);
  speechStartRef.current = speech.start;
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
  }, [clearRecordingTick]);

  const startRecordingTick = useCallback(() => {
    clearRecordingTick();
    recordingTickRef.current = setInterval(() => {
      const elapsed = getRecordingElapsedMs();
      setRecordingElapsedMs(elapsed);
      if (
        elapsed >= JOURNAL_VIDEO_MAX_DURATION_MS &&
        !maxDurationTriggeredRef.current &&
        recorderRef.current?.state === "recording"
      ) {
        maxDurationTriggeredRef.current = true;
        onMaxDurationRef.current?.();
        void stopRecordingRef.current?.();
      }
    }, 250);
  }, [clearRecordingTick, getRecordingElapsedMs]);

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
    if (videoElRef.current) videoElRef.current.srcObject = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const bindPreview = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      void el.play().catch(() => {});
    }
  }, []);

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
    resolveStopRef.current?.(null);
    resolveStopRef.current = null;
    cleanupStream();
    setMode(null);
    setPhase("idle");
    interimRef.current = "";
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
      interimRef.current = "";
      setInterim("");
      clearCountdown();
      try {
        cleanupStream();
        let stream: MediaStream;
        if (captureMode === "screen") {
          const session = await createScreenCompositeSession({
            onScreenShareEnded: () => {
              onScreenShareEndedRef.current?.();
              void stopRecordingRef.current?.();
            },
          });
          if (gen !== openGenRef.current) {
            session.stop();
            return;
          }
          compositeSessionRef.current = session;
          stream = session.compositeStream;
        } else {
          stream = await navigator.mediaDevices.getUserMedia(buildJournalVideoConstraints());
          if (gen !== openGenRef.current) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
        }
        streamRef.current = stream;
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
              ? "Screen or camera permission was blocked. Allow sharing when prompted."
              : "Camera permission was blocked. Enable camera and microphone for this site in your browser settings.",
          );
        } else if (err.name === "NotFoundError") {
          setError("No camera or screen source was found.");
        } else {
          setError(captureMode === "screen" ? "Could not start screen recording." : "Could not access the camera.");
        }
      }
    },
    [supported, cleanupStream, clearCountdown],
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
    interimRef.current = "";
    setInterim("");
    chunksRef.current = [];
    const recorderOptions: MediaRecorderOptions = { mimeType: mime };
    try {
      recorderOptions.videoBitsPerSecond = JOURNAL_VIDEO_BITS_PER_SECOND.video;
      recorderOptions.audioBitsPerSecond = JOURNAL_VIDEO_BITS_PER_SECOND.audio;
    } catch {
      /* optional — not all browsers honor bitrates */
    }
    const rec = new MediaRecorder(stream, recorderOptions);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime });
      resolveStopRef.current?.(blob.size > 0 ? blob : null);
      resolveStopRef.current = null;
    };
    rec.start(250);
    recorderRef.current = rec;
    recordingStartedAtRef.current = Date.now();
    pausedAccumMsRef.current = 0;
    pauseStartedAtRef.current = null;
    maxDurationTriggeredRef.current = false;
    setRecordingElapsedMs(0);
    startRecordingTick();
    setPhase("recording");
    if (speechSupportedRef.current) speechStartRef.current();
  }, [phase, clearCountdown, startRecordingTick]);

  const beginCountdown = useCallback(() => {
    if (phase !== "preview" || countdownTimerRef.current) return;
    setPhase("countdown");
    setCountdown(5);
    let n = 5;
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

  const pauseRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || phase !== "recording" || rec.state !== "recording") return;
    try {
      rec.pause();
      speechStopRef.current();
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
      if (pauseStartedAtRef.current != null) {
        pausedAccumMsRef.current += Date.now() - pauseStartedAtRef.current;
        pauseStartedAtRef.current = null;
      }
      if (speechSupportedRef.current) speechStartRef.current();
      setPhase("recording");
    } catch {
      /* ignore */
    }
  }, [phase]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (phase !== "recording" && phase !== "paused") return null;
    setPhase("processing");
    clearCountdown();
    clearRecordingTick();
    setRecordingElapsedMs(getRecordingElapsedMs());
    speechStopRef.current();
    interimRef.current = "";
    setInterim("");
    onInterimRef.current?.("");

    const rec = recorderRef.current;
    const blobPromise = new Promise<Blob | null>((resolve) => {
      resolveStopRef.current = resolve;
    });

    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        resolveStopRef.current?.(null);
        resolveStopRef.current = null;
      }
    } else {
      resolveStopRef.current?.(null);
      resolveStopRef.current = null;
    }

    const blob = await blobPromise;
    cleanupStream();
    resetRecordingClock();
    setMode(null);
    setPhase("idle");
    return blob;
  }, [phase, cleanupStream, clearCountdown, clearRecordingTick, getRecordingElapsedMs, resetRecordingClock]);

  stopRecordingRef.current = stopRecording;

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
    recordingRemainingMs: journalVideoRemainingMs(recordingElapsedMs),
    maxDurationMs: JOURNAL_VIDEO_MAX_DURATION_MS,
    bindPreview,
    openPreview,
    beginCountdown,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancel,
  };
}
