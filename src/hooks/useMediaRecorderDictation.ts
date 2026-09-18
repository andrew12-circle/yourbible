import { requireJournalCloudAi } from "@/lib/journal/journalAiAccess";
import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeJournalVoiceMemo, uploadJournalVoiceMemo } from "@/lib/journal/voiceDictation";

export interface UseMediaRecorderDictationOptions {
  userId: string | undefined;
  entryId?: string;
  onAppend: (chunk: string) => void;
  onInterim?: (partial: string) => void;
}

export interface UseMediaRecorderDictationApi {
  supported: boolean;
  listening: boolean;
  transcribing: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  cancel: () => void;
}

export function useMediaRecorderDictation(
  options: UseMediaRecorderDictationOptions,
): UseMediaRecorderDictationApi {
  const { userId, entryId, onAppend, onInterim } = options;
  const ownerKey = `${userId}:${entryId ?? ""}`;
  const identity = useRef(ownerKey); identity.current = ownerKey;
  const generation = useRef(0);
  const onAppendRef = useRef(onAppend);
  const onInterimRef = useRef(onInterim);
  onAppendRef.current = onAppend;
  onInterimRef.current = onInterim;

  const supported =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined";

  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        cleanupStream();
        setListening(false);
        onInterimRef.current?.("");
      }
      return;
    }
    cleanupStream();
    setListening(false);
    onInterimRef.current?.("");
  }, [cleanupStream]);

  const cancel = useCallback(() => {
    generation.current += 1;
    const recorder = recorderRef.current;
    if (recorder) { recorder.onstop = null; recorder.ondataavailable = null;
      if (recorder.state !== "inactive") { try { recorder.stop(); } catch { /* Release tracks below. */ } }
    }
    cleanupStream(); setListening(false); setTranscribing(false);
    onInterimRef.current?.("");
  }, [cleanupStream]);

  const start = useCallback(async () => {
    const token = ++generation.current;
    const valid = () => token === generation.current && identity.current === ownerKey;
    if (!supported || !userId) {
      setError(userId ? "Recording isn't supported in this browser." : "Sign in to use voice dictation.");
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!valid()) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        if (!valid()) return;
        setListening(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        cleanupStream();
        if (blob.size < 800) {
          onInterimRef.current?.("");
          setError("Recording was too short — try again.");
          return;
        }
        setTranscribing(true);
        try {
          if (entryId) await requireJournalCloudAi(entryId, userId);
          if (!valid()) return;
          const path = await uploadJournalVoiceMemo(userId, blob);
          if (!valid()) return;
          const result = await transcribeJournalVoiceMemo(path, "voice-memos", entryId);
          if (!valid()) return;
          onInterimRef.current?.("");
          if (!result.ok) {
            setError(result.error);
            return;
          }
          const text = result.text.trim();
          if (text) onAppendRef.current(`${text} `);
        } catch (e) {
          onInterimRef.current?.("");
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          if (valid()) setTranscribing(false);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setListening(true);
    } catch (e) {
      cleanupStream();
      setListening(false);
      onInterimRef.current?.("");
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Microphone permission was blocked. Enable the mic for this site in browser settings."
          : "Could not access the microphone.",
      );
    }
  }, [supported, userId, ownerKey, entryId, cleanupStream]);

  const toggle = useCallback(() => {
    if (transcribing) return;
    if (listening) stop();
    else void start();
  }, [listening, transcribing, start, stop]);

  useEffect(() => () => cancel(), [cancel, userId, entryId]);

  return { supported, listening, transcribing, error, start, stop, toggle, cancel };
}
