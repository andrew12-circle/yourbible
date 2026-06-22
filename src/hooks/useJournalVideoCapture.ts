import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildJournalVideoConstraints,
  journalVideoCaptureSupported,
  pickJournalVideoMimeType,
} from "@/lib/journal/videos";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";

export type JournalVideoCapturePhase = "idle" | "preview" | "recording" | "processing";

export interface UseJournalVideoCaptureOptions {
  onAppendTranscript: (chunk: string) => void;
  onInterim?: (partial: string) => void;
  language?: string;
}

export interface UseJournalVideoCaptureApi {
  supported: boolean;
  phase: JournalVideoCapturePhase;
  error: string | null;
  interim: string;
  bindPreview: (el: HTMLVideoElement | null) => void;
  openPreview: () => Promise<void>;
  startRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  cancel: () => void;
}

export function useJournalVideoCapture(options: UseJournalVideoCaptureOptions): UseJournalVideoCaptureApi {
  const { onAppendTranscript, onInterim, language } = options;
  const onAppendRef = useRef(onAppendTranscript);
  const onInterimRef = useRef(onInterim);
  onAppendRef.current = onAppendTranscript;
  onInterimRef.current = onInterim;

  const supported = journalVideoCaptureSupported();
  const [phase, setPhase] = useState<JournalVideoCapturePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [interim, setInterim] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);
  const interimRef = useRef("");

  const handleInterim = useCallback((text: string) => {
    interimRef.current = text;
    setInterim(text);
    onInterimRef.current?.(text);
  }, []);

  const speech = useSpeechDictation({
    onAppend: (chunk) => onAppendRef.current(chunk),
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

  const cleanupStream = useCallback(() => {
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
    setPhase("idle");
    interimRef.current = "";
    setInterim("");
    onInterimRef.current?.("");
  }, [cleanupStream]);

  const openPreview = useCallback(async () => {
    if (!supported) {
      setError("Video recording isn't supported in this browser.");
      return;
    }
    const gen = ++openGenRef.current;
    setError(null);
    setPhase("idle");
    interimRef.current = "";
    setInterim("");
    try {
      cleanupStream();
      const stream = await navigator.mediaDevices.getUserMedia(buildJournalVideoConstraints());
      if (gen !== openGenRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
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
      setPhase("idle");
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Camera permission was blocked. Enable camera and microphone for this site in your browser settings."
          : "Could not access the camera.",
      );
    }
  }, [supported, cleanupStream]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || phase !== "preview") return;
    const mime = pickJournalVideoMimeType();
    if (!mime) {
      setError("Video recording isn't supported in this browser.");
      return;
    }
    setError(null);
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: mime });
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
    setPhase("recording");
    if (speechSupportedRef.current) speechStartRef.current();
  }, [phase]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (phase !== "recording") return null;
    setPhase("processing");
    speechStopRef.current();
    const interimText = interimRef.current.trim();
    if (interimText) onAppendRef.current(`${interimText} `);
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
    setPhase("idle");
    return blob;
  }, [phase, cleanupStream]);

  useEffect(() => {
    return () => {
      openGenRef.current += 1;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return {
    supported,
    phase,
    error,
    interim,
    bindPreview,
    openPreview,
    startRecording,
    stopRecording,
    cancel,
  };
}
