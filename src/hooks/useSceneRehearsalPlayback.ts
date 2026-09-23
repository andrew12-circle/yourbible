import { useCallback, useEffect, useRef, useState } from "react";
import type { RehearsalBeat } from "@/lib/livingHope/sceneRehearsal";

/** A paced, optional device-voice guide. Never generates paid narration. */
export function useSceneRehearsalPlayback(beats: readonly RehearsalBeat[]) {
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const elapsed = useRef(0);
  const speechDone = useRef(true);
  const generation = useRef(0);
  const ownsSpeech = useRef(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const beat = beats[index];
  const voiceAvailable = typeof window !== "undefined" && "speechSynthesis" in window
    && "SpeechSynthesisUtterance" in window;

  const cancelVoice = useCallback(() => {
    generation.current += 1;
    if (ownsSpeech.current && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    ownsSpeech.current = false;
    utterance.current = null;
    speechDone.current = true;
  }, []);

  useEffect(() => {
    if (!running || !voiceEnabled || !voiceAvailable || !beat) return;
    cancelVoice();
    const token = generation.current;
    speechDone.current = false;
    ownsSpeech.current = true;
    setVoiceError("");
    // Short utterances avoid long-text truncation on some browser voices.
    const words = beat.text.split(/\s+/);
    const chunks: string[] = [];
    let chunk = "";
    for (const word of words) {
      if (chunk.length + word.length > 240) { chunks.push(chunk); chunk = ""; }
      chunk += `${chunk ? " " : ""}${word}`;
    }
    if (chunk) chunks.push(chunk);
    const speak = (part: number) => {
      if (token !== generation.current) return;
      if (part >= chunks.length) { speechDone.current = true; ownsSpeech.current = false; return; }
      const next = new SpeechSynthesisUtterance(chunks[part]);
      utterance.current = next;
      next.lang = "en-US";
      next.rate = 0.9;
      next.onend = () => speak(part + 1);
      const fail = () => {
        if (token !== generation.current) return;
        speechDone.current = true;
        ownsSpeech.current = false;
        setRunning(false);
        setVoiceError("Device voice stopped. Read the cue, or turn voice off and resume.");
      };
      next.onerror = fail;
      try { window.speechSynthesis.speak(next); }
      catch { fail(); }
    };
    speak(0);
    return cancelVoice;
  }, [beat, running, voiceEnabled, voiceAvailable, cancelVoice]);

  useEffect(() => {
    if (!running || !beat) return;
    const started = performance.now();
    const offset = elapsed.current;
    const timer = window.setInterval(() => {
      elapsed.current = offset + performance.now() - started;
      setElapsedMs(elapsed.current);
      // Narration may extend the target. Never cut off a cue to meet the clock.
      if (elapsed.current >= beat.seconds * 1000 && speechDone.current) {
        if (index < beats.length - 1) {
          elapsed.current = 0;
          setElapsedMs(0);
          setIndex((current) => current + 1);
        } else setRunning(false);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [running, beat, index, beats.length]);

  useEffect(() => {
    const visibility = () => { if (document.hidden) setRunning(false); };
    const otherAudio = (event: Event) => {
      if (event.target instanceof HTMLMediaElement) setRunning(false);
    };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("play", otherAudio, true);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("play", otherAudio, true);
      cancelVoice();
    };
  }, [cancelVoice]);

  const go = useCallback((next: number) => {
    cancelVoice();
    elapsed.current = 0;
    setElapsedMs(0);
    setIndex(Math.min(Math.max(0, next), Math.max(0, beats.length - 1)));
  }, [beats.length, cancelVoice]);
  const stop = useCallback(() => { setRunning(false); cancelVoice(); }, [cancelVoice]);
  const remaining = Math.max(0, (beat?.seconds ?? 0) - Math.floor(elapsedMs / 1000));
  return { index, beat, running, remaining, voiceEnabled, voiceAvailable, voiceError,
    setVoiceEnabled, go, stop, toggle: () => setRunning((current) => !current) };
}
