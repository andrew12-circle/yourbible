import { describe, expect, it } from "vitest";
import { buildRitualSteps } from "@/lib/livingHope/morningRitual";
import { emptyWorkbook } from "@/lib/livingHope/workbookTypes";
import {
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
