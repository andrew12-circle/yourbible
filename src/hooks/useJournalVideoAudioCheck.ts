import { useCallback, useEffect, useRef, useState } from "react";

const SPEECH_LEVEL_THRESHOLD = 0.1;
/** Milliseconds of speech-like input required before auto-continuing. */
const SPEECH_PASS_MS = 450;

/**
 * Detects brief speech during the pre-recording mic check ("say test, test").
 * Returns `passed` once the user has spoken into the mic or tapped continue.
 */
export function useJournalVideoAudioCheck(level: number, active: boolean) {
  const [passed, setPassed] = useState(false);
  const speechMsRef = useRef(0);
  const lastSampleAtRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setPassed(false);
    speechMsRef.current = 0;
    lastSampleAtRef.current = null;
  }, []);

  const markPassed = useCallback(() => {
    setPassed(true);
  }, []);

  useEffect(() => {
    if (!active) {
      reset();
    }
  }, [active, reset]);

  useEffect(() => {
    if (!active || passed) return;

    const now = performance.now();
    const last = lastSampleAtRef.current;
    lastSampleAtRef.current = now;

    if (last != null) {
      const dt = Math.min(now - last, 120);
      if (level >= SPEECH_LEVEL_THRESHOLD) {
        speechMsRef.current += dt;
        if (speechMsRef.current >= SPEECH_PASS_MS) {
          setPassed(true);
        }
      } else if (level < SPEECH_LEVEL_THRESHOLD * 0.45) {
        speechMsRef.current = Math.max(0, speechMsRef.current - dt * 0.35);
      }
    }
  }, [level, active, passed]);

  return { passed, markPassed, reset };
}
