import type { GoalTouch } from "@/lib/livingHope/api";
import { localDateISO } from "@/lib/lifePriorities";
import {
  clampRitualStepIndex,
  emptyDailyAssignment,
  emptyThanksgivingLists,
  ritualStepKey,
  ritualStepLabel,
  type DailyAssignment,
  type RitualStep,
} from "@/lib/livingHope/morningRitual";

const STORAGE_KEY = "yb_morning_ritual_draft_v1";

export interface MorningRitualDraft {
  reviewDate: string;
  expressMode: boolean;
  guidedMode: boolean;
  stepIndex: number;
  stepKey: string;
  stepLabel: string;
  totalSteps: number;
  touches: Record<string, GoalTouch>;
  visionRecall: string;
  storyRecall: string;
  metricValues: Record<string, string>;
  thanksgivingNow: string[];
  thanksgivingNotYet: string[];
  scriptureReflection: string;
  dailyAssignment: DailyAssignment;
  surrender: string;
  covering: string;
  storySelectedIndex: number | null;
  updatedAt: string;
}

export interface MorningRitualDraftSummary {
  reviewDate: string;
  expressMode: boolean;
  guidedMode: boolean;
  stepIndex: number;
  totalSteps: number;
  stepLabel: string;
  /** True when user has moved past intro and not finished. */
  inProgress: boolean;
}

export interface MorningRitualDraftInput {
  expressMode: boolean;
  guidedMode: boolean;
  stepIndex: number;
  steps: RitualStep[];
  goalIndex?: number;
  goalTotal?: number;
  touches: Record<string, GoalTouch>;
  visionRecall: string;
  storyRecall: string;
  metricValues: Record<string, string>;
  thanksgivingNow: string[];
  thanksgivingNotYet: string[];
  scriptureReflection: string;
  dailyAssignment: DailyAssignment;
  surrender: string;
  covering: string;
  storySelectedIndex: number | null;
}

function readAll(): Record<string, MorningRitualDraft> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MorningRitualDraft>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, MorningRitualDraft>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadMorningRitualDraft(userId: string): MorningRitualDraft | null {
  const draft = readAll()[userId];
  if (!draft || draft.reviewDate !== localDateISO()) return null;
  return draft;
}

export function saveMorningRitualDraft(userId: string, input: MorningRitualDraftInput): void {
  const step = input.steps[clampRitualStepIndex(input.stepIndex, input.steps)];
  if (!step || step.kind === "done") return;

  const draft: MorningRitualDraft = {
    reviewDate: localDateISO(),
    expressMode: input.expressMode,
    guidedMode: input.guidedMode,
    stepIndex: clampRitualStepIndex(input.stepIndex, input.steps),
    stepKey: ritualStepKey(step),
    stepLabel: ritualStepLabel(step, input.goalIndex, input.goalTotal),
    totalSteps: input.steps.length,
    touches: input.touches,
    visionRecall: input.visionRecall,
    storyRecall: input.storyRecall,
    metricValues: input.metricValues,
    thanksgivingNow: input.thanksgivingNow,
    thanksgivingNotYet: input.thanksgivingNotYet,
    scriptureReflection: input.scriptureReflection,
    dailyAssignment: input.dailyAssignment,
    surrender: input.surrender,
    covering: input.covering,
    storySelectedIndex: input.storySelectedIndex,
    updatedAt: new Date().toISOString(),
  };

  const all = readAll();
  all[userId] = draft;
  writeAll(all);
}

export function clearMorningRitualDraft(userId: string): void {
  const all = readAll();
  if (!all[userId]) return;
  delete all[userId];
  writeAll(all);
}

export function summarizeMorningRitualDraft(draft: MorningRitualDraft | null): MorningRitualDraftSummary | null {
  if (!draft || draft.reviewDate !== localDateISO()) return null;

  const inProgress = draft.stepIndex > 0 && draft.stepIndex < draft.totalSteps - 1;

  return {
    reviewDate: draft.reviewDate,
    expressMode: draft.expressMode,
    guidedMode: draft.guidedMode ?? true,
    stepIndex: draft.stepIndex,
    totalSteps: draft.totalSteps,
    stepLabel: draft.stepLabel,
    inProgress,
  };
}

export function getMorningRitualDraftSummary(userId: string | undefined): MorningRitualDraftSummary | null {
  if (!userId) return null;
  return summarizeMorningRitualDraft(loadMorningRitualDraft(userId));
}

/** Resolve step index from a saved draft when step list may have changed. */
export function resolveDraftStepIndex(draft: MorningRitualDraft, steps: RitualStep[]): number {
  const byKey = steps.findIndex((s) => ritualStepKey(s) === draft.stepKey);
  if (byKey >= 0) return clampRitualStepIndex(byKey, steps);
  return clampRitualStepIndex(draft.stepIndex, steps);
}

export function emptyMorningRitualDraftFields(): Omit<
  MorningRitualDraftInput,
  "expressMode" | "guidedMode" | "stepIndex" | "steps" | "goalIndex" | "goalTotal"
> {
  const thanksgiving = emptyThanksgivingLists();
  return {
    touches: {},
    visionRecall: "",
    storyRecall: "",
    metricValues: {},
    thanksgivingNow: thanksgiving.now,
    thanksgivingNotYet: thanksgiving.notYet,
    scriptureReflection: "",
    dailyAssignment: emptyDailyAssignment(),
    surrender: "",
    covering: "",
    storySelectedIndex: null,
  };
}
