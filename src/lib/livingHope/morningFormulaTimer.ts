import { localDateISO } from "@/lib/lifePriorities";
import { ritualStepKey, type RitualStep } from "@/lib/livingHope/morningRitual";

export type SessionDurationMin = 15 | 30 | 60;

export const SESSION_DURATION_OPTIONS: readonly SessionDurationMin[] = [15, 30, 60];
export const DEFAULT_SESSION_DURATION_MIN: SessionDurationMin = 60;

const STORAGE_KEY = "yb_morning_formula_timer_v1";
const MIN_STEP_MS = 45 * 1000;

/** Relative pacing weights — worship & scripture get more room. */
export const STEP_TIME_WEIGHTS: Partial<Record<RitualStep["kind"], number>> = {
  intro: 0,
  done: 0,
  worship: 5,
  thanksgiving: 3,
  scripture: 5,
  prayer: 3,
  manifesto: 2,
  vision: 3,
  story: 3,
  surrender: 4,
  covering: 3,
  assignment: 2,
  goal: 2,
  metrics: 2,
};

export interface FormulaTimerPersistedState {
  reviewDate: string;
  durationMin: SessionDurationMin;
  stepKey: string | null;
  stepStartedAt: string | null;
}

function defaultPersistedState(): FormulaTimerPersistedState {
  return {
    reviewDate: localDateISO(),
    durationMin: DEFAULT_SESSION_DURATION_MIN,
    stepKey: null,
    stepStartedAt: null,
  };
}

function readPersistedState(): FormulaTimerPersistedState {
  if (typeof window === "undefined") return defaultPersistedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersistedState();
    const parsed = JSON.parse(raw) as FormulaTimerPersistedState;
    if (parsed.reviewDate !== localDateISO()) return defaultPersistedState();
    const durationMin = SESSION_DURATION_OPTIONS.includes(parsed.durationMin as SessionDurationMin)
      ? (parsed.durationMin as SessionDurationMin)
      : DEFAULT_SESSION_DURATION_MIN;
    return {
      reviewDate: parsed.reviewDate,
      durationMin,
      stepKey: parsed.stepKey ?? null,
      stepStartedAt: parsed.stepStartedAt ?? null,
    };
  } catch {
    return defaultPersistedState();
  }
}

function writePersistedState(state: FormulaTimerPersistedState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getSessionDurationMin(): SessionDurationMin {
  return readPersistedState().durationMin;
}

export function setSessionDurationMin(durationMin: SessionDurationMin): void {
  const state = readPersistedState();
  writePersistedState({ ...state, durationMin, stepKey: null, stepStartedAt: null });
}

export function clearMorningFormulaTimer(): void {
  writePersistedState(defaultPersistedState());
}

export function stepTimeWeight(step: RitualStep): number {
  return STEP_TIME_WEIGHTS[step.kind] ?? 2;
}

/** Budget ms per step key for today's session length. */
export function buildStepDurationMap(
  steps: RitualStep[],
  totalMinutes: SessionDurationMin,
): Record<string, number> {
  const timedSteps = steps.filter((s) => s.kind !== "intro" && s.kind !== "done");
  if (!timedSteps.length) return {};

  const totalMs = totalMinutes * 60 * 1000;
  const totalWeight = timedSteps.reduce((sum, step) => sum + stepTimeWeight(step), 0);
  if (totalWeight <= 0) return {};

  const map: Record<string, number> = {};
  let allocated = 0;

  timedSteps.forEach((step, index) => {
    const key = ritualStepKey(step);
    if (index === timedSteps.length - 1) {
      map[key] = Math.max(MIN_STEP_MS, totalMs - allocated);
      return;
    }
    const weight = stepTimeWeight(step);
    const ms = Math.max(MIN_STEP_MS, Math.round((weight / totalWeight) * totalMs));
    map[key] = ms;
    allocated += ms;
  });

  return map;
}

export function formatFormulaCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.ceil(msRemaining / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function elapsedSince(iso: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Date.now() - t);
}

export interface FormulaTimerSnapshot {
  durationMin: SessionDurationMin;
  stepKey: string | null;
  stepBudgetMs: number;
  stepRemainingMs: number;
  stepExpired: boolean;
  sessionRemainingMs: number;
}

export function computeFormulaTimerSnapshot(
  steps: RitualStep[],
  stepIndex: number,
  durationMin: SessionDurationMin,
  stepStartedAt: string | null,
  activeStepKey: string | null,
): FormulaTimerSnapshot {
  const budgets = buildStepDurationMap(steps, durationMin);
  const step = steps[stepIndex];
  const stepKey = step ? ritualStepKey(step) : null;
  const stepBudgetMs = stepKey ? (budgets[stepKey] ?? 0) : 0;
  const elapsedMs = stepKey && stepKey === activeStepKey ? elapsedSince(stepStartedAt) : 0;
  const stepRemainingMs = Math.max(0, stepBudgetMs - elapsedMs);

  let sessionRemainingMs = stepRemainingMs;
  for (let i = stepIndex + 1; i < steps.length; i += 1) {
    const future = steps[i];
    if (!future || future.kind === "done") continue;
    sessionRemainingMs += budgets[ritualStepKey(future)] ?? 0;
  }

  return {
    durationMin,
    stepKey,
    stepBudgetMs,
    stepRemainingMs,
    stepExpired: stepBudgetMs > 0 && stepRemainingMs <= 0,
    sessionRemainingMs,
  };
}

export function beginFormulaStepTimer(stepKey: string): string {
  const now = new Date().toISOString();
  const state = readPersistedState();
  writePersistedState({ ...state, stepKey, stepStartedAt: now });
  return now;
}

export function loadFormulaStepTimer(): Pick<FormulaTimerPersistedState, "stepKey" | "stepStartedAt"> {
  const { stepKey, stepStartedAt } = readPersistedState();
  return { stepKey, stepStartedAt };
}

export function isTimedRitualStep(step: RitualStep): boolean {
  return step.kind !== "intro" && step.kind !== "done";
}
