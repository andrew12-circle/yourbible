import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  beginFormulaStepTimer,
  extendFormulaStepTimer,
  computeFormulaTimerSnapshot,
  getSessionDurationMin,
  isTimedRitualStep,
  loadFormulaStepTimer,
  setSessionDurationMin,
  type SessionDurationMin,
} from "@/lib/livingHope/morningFormulaTimer";
import { ritualStepKey, type RitualStep } from "@/lib/livingHope/morningRitual";

const SOUND_CUES_KEY = "yb_morning_formula_sound_cues_v1";

function readSoundCuesEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(SOUND_CUES_KEY) !== "off"; } catch { return true; }
}

function writeSoundCuesEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SOUND_CUES_KEY, enabled ? "on" : "off"); } catch { /* Keep the in-memory preference. */ }
}

function playTimerTone(context: AudioContext, frequency: number, durationMs: number, gain = 0.11): void {
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const now = context.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  volume.gain.setValueAtTime(0.0001, now);
  volume.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  volume.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + durationMs / 1000 + 0.02);
}

export function useMorningFormulaTimer(steps: RitualStep[], stepIndex: number) {
  const step = steps[stepIndex];
  const stepKey = step ? ritualStepKey(step) : null;
  const timed = step ? isTimedRitualStep(step) : false;

  const [durationMin, setDurationMinState] = useState<SessionDurationMin>(() => getSessionDurationMin());
  const [stepStartedAt, setStepStartedAt] = useState<string | null>(() => loadFormulaStepTimer().stepStartedAt);
  const [activeStepKey, setActiveStepKey] = useState<string | null>(() => loadFormulaStepTimer().stepKey);
  const [tick, setTick] = useState(0);
  const [stepExtraMs, setStepExtraMs] = useState(() => loadFormulaStepTimer().stepExtraMs ?? 0);
  const [soundCuesEnabled, setSoundCuesEnabledState] = useState(readSoundCuesEnabled);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousRemainingMsRef = useRef<number | null>(null);
  const cueStepKeyRef = useRef<string | null>(null);

  const ensureAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextCtor();
    if (audioContextRef.current.state === "suspended") void audioContextRef.current.resume();
    return audioContextRef.current;
  }, []);

  useEffect(() => {
    if (!soundCuesEnabled) return;
    const unlock = () => { ensureAudioContext(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [ensureAudioContext, soundCuesEnabled]);

  useEffect(() => {
    if (!stepKey || !timed) return;

    const persisted = loadFormulaStepTimer();
    if (persisted.stepKey === stepKey && persisted.stepStartedAt) {
      setActiveStepKey(stepKey);
      setStepStartedAt(persisted.stepStartedAt);
      setStepExtraMs(persisted.stepExtraMs ?? 0);
      return;
    }

    const startedAt = beginFormulaStepTimer(stepKey);
    setStepExtraMs(0);
    setActiveStepKey(stepKey);
    setStepStartedAt(startedAt);
  }, [stepKey, timed]);

  useEffect(() => {
    if (!timed) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [timed]);

  const snapshot = useMemo(
    () =>
      computeFormulaTimerSnapshot(
        steps,
        stepIndex,
        durationMin,
        stepStartedAt,
        activeStepKey,
        stepExtraMs,
      ),
    [steps, stepIndex, durationMin, stepStartedAt, activeStepKey, stepExtraMs, tick],
  );

  useEffect(() => {
    if (!timed || !stepKey) {
      previousRemainingMsRef.current = null;
      cueStepKeyRef.current = stepKey;
      return;
    }

    if (cueStepKeyRef.current !== stepKey) {
      cueStepKeyRef.current = stepKey;
      previousRemainingMsRef.current = snapshot.stepRemainingMs;
      return;
    }

    const previous = previousRemainingMsRef.current;
    const current = snapshot.stepRemainingMs;
    previousRemainingMsRef.current = current;
    if (!soundCuesEnabled || previous == null || current >= previous) return;

    const crossed = (thresholdMs: number) => previous > thresholdMs && current <= thresholdMs;
    const context = crossed(60_000) || crossed(30_000) || crossed(5_000) || crossed(4_000) ||
      crossed(3_000) || crossed(2_000) || crossed(1_000) || crossed(0)
      ? ensureAudioContext()
      : null;
    if (!context) return;

    if (crossed(0)) {
      playTimerTone(context, 880, 360, 0.16);
      window.setTimeout(() => playTimerTone(context, 1175, 420, 0.14), 170);
      return;
    }
    if (crossed(5_000) || crossed(4_000) || crossed(3_000) || crossed(2_000) || crossed(1_000)) {
      playTimerTone(context, 760, 120, 0.12);
      return;
    }
    if (crossed(30_000)) {
      playTimerTone(context, 620, 110, 0.075);
      return;
    }
    if (crossed(60_000)) playTimerTone(context, 660, 170, 0.09);
  }, [ensureAudioContext, snapshot.stepRemainingMs, soundCuesEnabled, stepKey, timed]);

  const setSoundCuesEnabled = useCallback((enabled: boolean) => {
    writeSoundCuesEnabled(enabled);
    setSoundCuesEnabledState(enabled);
    if (enabled) ensureAudioContext();
  }, [ensureAudioContext]);

  useEffect(() => () => {
    if (audioContextRef.current) void audioContextRef.current.close();
  }, []);

  const setDurationMin = useCallback((next: SessionDurationMin) => {
    setSessionDurationMin(next);
    setDurationMinState(next);
    if (stepKey && timed) {
      const startedAt = beginFormulaStepTimer(stepKey);
      setStepExtraMs(0);
      setStepStartedAt(startedAt);
      setActiveStepKey(stepKey);
    }
  }, [stepKey, timed]);

  return {
    durationMin,
    setDurationMin,
    soundCuesEnabled,
    setSoundCuesEnabled,
    addFiveMinutes: () => { if (stepKey && timed) setStepExtraMs(extendFormulaStepTimer(stepKey, 5 * 60 * 1000)); },
    showTimer: timed,
    ...snapshot,
  };
}
