import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildJournalVideoConstraints,
  journalVideoCaptureSupported,
  pickJournalAudioMimeType,
  pickJournalVideoMimeType,
  tuneJournalVideoStream,
} from "@/lib/journal/videos";
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
  type ScreenCompositeSession,
} from "@/lib/journal/screenRecordingComposite";
import { mergeDictatedText, useSpeechDictation } from "@/hooks/useSpeechDictation";
import { composeVideoLiveTranscript } from "@/lib/journal/journalVideoBody";

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
};

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
  recordingBytes: number;
  recordingRemainingMs: number;
  maxDurationMs: number;
  bindPreview: (el: HTMLVideoElement | null) => void;
  openPreview: (mode: JournalVideoCaptureMode) => Promise<void>;
  beginCountdown: () => void;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<JournalVideoCaptureResult | null>;
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
  const [recordingBytes, setRecordingBytes] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const compositeSessionRef = useRef<ScreenCompositeSession | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const resolveStopRef = useRef<((result: JournalVideoCaptureResult | null) => void) | null>(null);
  const resolveAudioStopRef = useRef<((blob: Blob | null) => void) | null>(null);
  const finalizedTranscriptRef = useRef("");
  const interimPartialRef = useRef("");
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const pausedAccumMsRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const maxDurationTriggeredRef = useRef(false);
  const stopRecordingRef = useRef<(() => Promise<Blob | null>) | null>(null);

  const syncLiveTranscriptDisplay = useCallback(() => {
    const combined = composeVideoLiveTranscript(
      finalizedTranscriptRef.current,
      interimPartialRef.current,
    );
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
      finalizedTranscriptRef.current = mergeDictatedText(finalizedTranscriptRef.current, chunk);
      syncLiveTranscriptDisplay();
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
          await tuneJournalVideoStream(stream);
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
              ? "Screen or camera access was blocked. Tap Allow when prompted, or check Settings → Safari → Camera/Microphone for this site."
              : "Camera or microphone access was blocked. Tap Allow when prompted, or check Settings → Safari → Camera/Microphone for this site.",
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
    finalizedTranscriptRef.current = "";
    interimPartialRef.current = "";
    setInterim("");
    chunksRef.current = [];
    audioChunksRef.current = [];
    const recorderOptions: MediaRecorderOptions = { mimeType: mime };
    try {
      recorderOptions.bitsPerSecond = JOURNAL_VIDEO_TARGET_BITS_PER_SECOND;
      recorderOptions.videoBitsPerSecond = JOURNAL_VIDEO_BITS_PER_SECOND.video;
      recorderOptions.audioBitsPerSecond = JOURNAL_VIDEO_BITS_PER_SECOND.audio;
    } catch {
      /* optional — not all browsers honor bitrates */
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

    const audioMime = pickJournalAudioMimeType();
    const audioTracks = stream.getAudioTracks();
    if (audioMime && audioTracks.length) {
      try {
        const audioStream = new MediaStream(audioTracks);
        const audioRec = new MediaRecorder(audioStream, { mimeType: audioMime });
        audioRec.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        audioRec.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: audioRec.mimeType || audioMime });
          resolveAudioStopRef.current?.(audioBlob.size > 0 ? audioBlob : null);
          resolveAudioStopRef.current = null;
        };
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
    setRecordingElapsedMs(0);
    setRecordingBytes(0);
    startRecordingTick();
    setPhase("recording");
    if (speechSupportedRef.current) speechStartRef.current();
  }, [phase, clearCountdown, startRecordingTick, syncRecordingBytes]);

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
      const audioRec = audioRecorderRef.current;
      if (audioRec && audioRec.state === "recording") audioRec.pause();
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
      const audioRec = audioRecorderRef.current;
      if (audioRec && audioRec.state === "paused") audioRec.resume();
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

  const stopRecording = useCallback(async (): Promise<JournalVideoCaptureResult | null> => {
    if (phase !== "recording" && phase !== "paused") return null;
    setPhase("processing");
    clearCountdown();
    clearRecordingTick();
    setRecordingElapsedMs(getRecordingElapsedMs());
    const liveTranscript = composeVideoLiveTranscript(
      finalizedTranscriptRef.current,
      interimPartialRef.current,
    ).trim();
    speechStopRef.current();
    finalizedTranscriptRef.current = "";
    interimPartialRef.current = "";
    setInterim("");
    onInterimRef.current?.("");

    const rec = recorderRef.current;
    const audioRec = audioRecorderRef.current;
    const videoPromise = new Promise<Blob | null>((resolve) => {
      resolveStopRef.current = resolve;
    });
    const audioPromise = new Promise<Blob | null>((resolve) => {
      resolveAudioStopRef.current = resolve;
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

    if (audioRec && audioRec.state !== "inactive") {
      try {
        audioRec.stop();
      } catch {
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
    if (!videoBlob) return null;
    return { video: videoBlob, audio: audioBlob, liveTranscript };
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
    recordingBytes,
    recordingRemainingMs: journalVideoEffectiveRemainingMs(recordingElapsedMs, recordingBytes),
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
