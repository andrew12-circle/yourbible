import { useCallback, useEffect, useMemo, useState } from "react";
import {
  beginFormulaStepTimer,
  computeFormulaTimerSnapshot,
  getSessionDurationMin,
  isTimedRitualStep,
  loadFormulaStepTimer,
  setSessionDurationMin,
  type SessionDurationMin,
} from "@/lib/livingHope/morningFormulaTimer";
import { ritualStepKey, type RitualStep } from "@/lib/livingHope/morningRitual";

export function useMorningFormulaTimer(steps: RitualStep[], stepIndex: number) {
  const step = steps[stepIndex];
  const stepKey = step ? ritualStepKey(step) : null;
  const timed = step ? isTimedRitualStep(step) : false;

  const [durationMin, setDurationMinState] = useState<SessionDurationMin>(() => getSessionDurationMin());
  const [stepStartedAt, setStepStartedAt] = useState<string | null>(() => loadFormulaStepTimer().stepStartedAt);
  const [activeStepKey, setActiveStepKey] = useState<string | null>(() => loadFormulaStepTimer().stepKey);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!stepKey || !timed) return;

    const persisted = loadFormulaStepTimer();
    if (persisted.stepKey === stepKey && persisted.stepStartedAt) {
      setActiveStepKey(stepKey);
      setStepStartedAt(persisted.stepStartedAt);
      return;
    }

    const startedAt = beginFormulaStepTimer(stepKey);
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
      ),
    [steps, stepIndex, durationMin, stepStartedAt, activeStepKey, tick],
  );

  const setDurationMin = useCallback((next: SessionDurationMin) => {
    setSessionDurationMin(next);
    setDurationMinState(next);
    if (stepKey && timed) {
      const startedAt = beginFormulaStepTimer(stepKey);
      setStepStartedAt(startedAt);
      setActiveStepKey(stepKey);
    }
  }, [stepKey, timed]);

  return {
    durationMin,
    setDurationMin,
    showTimer: timed,
    ...snapshot,
  };
}
