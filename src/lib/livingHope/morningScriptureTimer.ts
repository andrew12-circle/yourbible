import { localDateISO } from "@/lib/lifePriorities";

const STORAGE_KEY = "yb_morning_scripture_timer_v1";

interface ScriptureTimerState {
  reviewDate: string;
  accumulatedMs: number;
  runningSince: string | null;
}

function readState(): ScriptureTimerState {
  if (typeof window === "undefined") {
    return { reviewDate: localDateISO(), accumulatedMs: 0, runningSince: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { reviewDate: localDateISO(), accumulatedMs: 0, runningSince: null };
    const parsed = JSON.parse(raw) as ScriptureTimerState;
    if (parsed.reviewDate !== localDateISO()) {
      return { reviewDate: localDateISO(), accumulatedMs: 0, runningSince: null };
    }
    return {
      reviewDate: parsed.reviewDate,
      accumulatedMs: Math.max(0, Number(parsed.accumulatedMs) || 0),
      runningSince: parsed.runningSince ?? null,
    };
  } catch {
    return { reviewDate: localDateISO(), accumulatedMs: 0, runningSince: null };
  }
}

function writeState(state: ScriptureTimerState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function elapsedSince(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Date.now() - t);
}

/** Total ms spent reading today (including active session). */
export function getMorningScriptureElapsedMs(): number {
  const state = readState();
  let total = state.accumulatedMs;
  if (state.runningSince) total += elapsedSince(state.runningSince);
  return total;
}

export function startMorningScriptureTimer(): void {
  const state = readState();
  if (state.runningSince) return;
  writeState({ ...state, runningSince: new Date().toISOString() });
}

export function pauseMorningScriptureTimer(): void {
  const state = readState();
  if (!state.runningSince) return;
  writeState({
    reviewDate: state.reviewDate,
    accumulatedMs: state.accumulatedMs + elapsedSince(state.runningSince),
    runningSince: null,
  });
}

export function clearMorningScriptureTimer(): void {
  writeState({ reviewDate: localDateISO(), accumulatedMs: 0, runningSince: null });
}
