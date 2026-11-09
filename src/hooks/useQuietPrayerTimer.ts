import { useCallback, useEffect, useRef, useState } from "react";

export type QuietPrayerDuration = 2 | 5 | 10 | null;
export type QuietPrayerTimerPhase = "idle" | "running" | "paused" | "finished";

type Clock = {
  durationMinutes: QuietPrayerDuration;
  phase: QuietPrayerTimerPhase;
  elapsedBeforeRun: number;
  startedAt: number | null;
};

type Snapshot = {
  durationMinutes: QuietPrayerDuration;
  phase: QuietPrayerTimerPhase;
  elapsedMs: number;
  remainingMs: number | null;
};

function initialDuration(minutes: number): QuietPrayerDuration {
  return minutes === 2 || minutes === 10 ? minutes : 5;
}

function readElapsed(clock: Clock, now: number): number {
  const runningMs = clock.phase === "running" && clock.startedAt !== null
    ? Math.max(0, now - clock.startedAt)
    : 0;
  return clock.elapsedBeforeRun + runningMs;
}

function readSnapshot(clock: Clock, now: number): Snapshot {
  const elapsedMs = readElapsed(clock, now);
  return {
    durationMinutes: clock.durationMinutes,
    phase: clock.phase,
    elapsedMs,
    remainingMs: clock.durationMinutes === null
      ? null
      : Math.max(0, clock.durationMinutes * 60_000 - elapsedMs),
  };
}

/** A quiet, opt-in timer. The clock advances by elapsed time, never by counting ticks. */
export function useQuietPrayerTimer(initialMinutes = 5) {
  const clockRef = useRef<Clock>({
    durationMinutes: initialDuration(initialMinutes),
    phase: "idle",
    elapsedBeforeRun: 0,
    startedAt: null,
  });
  const [snapshot, setSnapshot] = useState(() => readSnapshot(clockRef.current, Date.now()));
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [soundUnavailable, setSoundUnavailable] = useState(false);
  const soundEnabledRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  const prepareAudio = useCallback(() => {
    try {
      const Audio = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) {
        setSoundUnavailable(true);
        return;
      }
      if (!audioRef.current || audioRef.current.state === "closed") audioRef.current = new Audio();
      if (audioRef.current.state === "suspended") {
        void audioRef.current.resume().catch(() => setSoundUnavailable(true));
      }
      setSoundUnavailable(false);
    } catch {
      setSoundUnavailable(true);
    }
  }, []);

  const playFinishTone = useCallback(() => {
    const context = audioRef.current;
    if (!soundEnabledRef.current || !context || context.state !== "running") return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(now);
      oscillator.stop(now + 1.15);
    } catch {
      setSoundUnavailable(true);
    }
  }, []);

  const refresh = useCallback(() => {
    const clock = clockRef.current;
    const now = Date.now();
    const budgetMs = clock.durationMinutes === null ? null : clock.durationMinutes * 60_000;
    if (clock.phase === "running" && budgetMs !== null && readElapsed(clock, now) >= budgetMs) {
      // Mark completion before audio or rendering, so overlapping wake/focus ticks cannot chime twice.
      clockRef.current = { ...clock, phase: "finished", elapsedBeforeRun: budgetMs, startedAt: null };
      playFinishTone();
    }
    setSnapshot(readSnapshot(clockRef.current, now));
  }, [playFinishTone]);

  useEffect(() => {
    if (snapshot.phase !== "running") return;
    const interval = window.setInterval(refresh, 250);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh, snapshot.phase]);

  useEffect(() => () => {
    const context = audioRef.current;
    audioRef.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }, []);

  const start = useCallback(() => {
    const clock = clockRef.current;
    if (clock.phase !== "idle" && clock.phase !== "paused") return;
    if (soundEnabledRef.current) prepareAudio();
    clockRef.current = { ...clock, phase: "running", startedAt: Date.now() };
    refresh();
  }, [prepareAudio, refresh]);

  const pause = useCallback(() => {
    const clock = clockRef.current;
    if (clock.phase !== "running") return;
    const elapsedMs = readElapsed(clock, Date.now());
    const budgetMs = clock.durationMinutes === null ? null : clock.durationMinutes * 60_000;
    if (budgetMs !== null && elapsedMs >= budgetMs) {
      refresh();
      return;
    }
    clockRef.current = { ...clock, phase: "paused", elapsedBeforeRun: elapsedMs, startedAt: null };
    refresh();
  }, [refresh]);

  const setDurationMinutes = useCallback((durationMinutes: QuietPrayerDuration) => {
    if (clockRef.current.phase === "running") return;
    clockRef.current = { durationMinutes, phase: "idle", elapsedBeforeRun: 0, startedAt: null };
    refresh();
  }, [refresh]);

  const reset = useCallback(() => {
    clockRef.current = { ...clockRef.current, phase: "idle", elapsedBeforeRun: 0, startedAt: null };
    refresh();
  }, [refresh]);

  const continueSitting = useCallback(() => {
    if (clockRef.current.phase !== "finished") return;
    clockRef.current = {
      ...clockRef.current,
      durationMinutes: null,
      phase: "running",
      startedAt: Date.now(),
    };
    refresh();
  }, [refresh]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled;
    setSoundEnabledState(enabled);
    if (enabled) prepareAudio();
  }, [prepareAudio]);

  return {
    ...snapshot,
    soundEnabled,
    soundUnavailable,
    setSoundEnabled,
    setDurationMinutes,
    start,
    pause,
    reset,
    continueSitting,
  };
}
