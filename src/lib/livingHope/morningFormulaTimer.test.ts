import { describe, expect, it } from "vitest";
import { buildRitualSteps } from "@/lib/livingHope/morningRitual";
import { emptyWorkbook } from "@/lib/livingHope/workbookTypes";
import {
  beginFormulaStepTimer,
  extendFormulaStepTimer,
  loadFormulaStepTimer,
  clearMorningFormulaTimer,
  buildStepDurationMap,
  computeFormulaTimerSnapshot,
  formatFormulaCountdown,
} from "@/lib/livingHope/morningFormulaTimer";
import { ritualStepKey as stepKey } from "@/lib/livingHope/morningRitual";

describe("buildStepDurationMap", () => {
  it("allocates the full session across timed steps", () => {
    const steps = buildRitualSteps(null, []);
    const budgets = buildStepDurationMap(steps, 60);
    const timedKeys = steps
      .filter((s) => s.kind !== "intro" && s.kind !== "done")
      .map((s) => stepKey(s));
    const totalMs = timedKeys.reduce((sum, key) => sum + (budgets[key] ?? 0), 0);
    expect(totalMs).toBe(60 * 60 * 1000);
    expect(budgets[stepKey({ kind: "worship" })]).toBeGreaterThan(
      budgets[stepKey({ kind: "assignment" })],
    );
  });

  it("scales down for shorter sessions", () => {
    const steps = buildRitualSteps(null, []);
    const full = buildStepDurationMap(steps, 60);
    const half = buildStepDurationMap(steps, 30);
    const worshipKey = stepKey({ kind: "worship" });
    expect(half[worshipKey]).toBeLessThan(full[worshipKey]);
  });
});

describe("computeFormulaTimerSnapshot", () => {
  it("counts down step and session remaining time", () => {
    const steps = buildRitualSteps(emptyWorkbook(), []);
    const worshipIndex = steps.findIndex((s) => s.kind === "worship");
    const budgets = buildStepDurationMap(steps, 30);
    const worshipKey = stepKey({ kind: "worship" });
    const startedAt = new Date(Date.now() - 60_000).toISOString();

    const snap = computeFormulaTimerSnapshot(steps, worshipIndex, 30, startedAt, worshipKey);
    expect(snap.stepRemainingMs).toBeLessThanOrEqual(budgets[worshipKey] ?? 0);
    expect(snap.sessionRemainingMs).toBeGreaterThanOrEqual(snap.stepRemainingMs);
  });
});

describe("formatFormulaCountdown", () => {
  it("formats mm:ss", () => {
    expect(formatFormulaCountdown(125_000)).toBe("2:05");
    expect(formatFormulaCountdown(0)).toBe("0:00");
  });
});

describe("flexible thanksgiving pacing", () => {
  it("persists five extra minutes on the current step", () => {
    clearMorningFormulaTimer();
    const key = stepKey({ kind: "thanksgiving" });
    beginFormulaStepTimer(key);
    expect(extendFormulaStepTimer(key, 300_000)).toBe(300_000);
    expect(loadFormulaStepTimer().stepExtraMs).toBe(300_000);
    const steps = buildRitualSteps(null, []);
    const index = steps.findIndex((step) => step.kind === "thanksgiving");
    const base = computeFormulaTimerSnapshot(steps, index, 30, null, key, 0);
    const extra = computeFormulaTimerSnapshot(steps, index, 30, null, key, 300_000);
    expect(extra.stepRemainingMs - base.stepRemainingMs).toBe(300_000);
    expect(extra.sessionRemainingMs - base.sessionRemainingMs).toBe(300_000);
    clearMorningFormulaTimer();
  });
  it("never leaks the previous step's extension into a newly selected step", () => {
    const steps = buildRitualSteps(null, []);
    const index = steps.findIndex((step) => step.kind === "scripture");
    const a = computeFormulaTimerSnapshot(steps, index, 30, null, "thanksgiving", 300_000);
    const b = computeFormulaTimerSnapshot(steps, index, 30, null, "thanksgiving", 0);
    expect(a.stepBudgetMs).toBe(b.stepBudgetMs);
  });
});
