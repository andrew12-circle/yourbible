import { describe, expect, it } from "vitest";
import { getMorningFormulaEntryTarget } from "@/lib/livingHope/morningFormulaEntry";
import {
  loadMorningRitualDraft,
  resolveDraftStepIndex,
  saveMorningRitualDraft,
  summarizeMorningRitualDraft,
} from "@/lib/livingHope/morningRitualDraft";
import { buildExpressRitualSteps, buildRitualSteps } from "@/lib/livingHope/morningRitual";
import { localDateISO } from "@/lib/lifePriorities";

describe("getMorningFormulaEntryTarget", () => {
  it("routes to hub when foundation is not ready", () => {
    const target = getMorningFormulaEntryTarget({
      ritualReady: false,
      reviewedToday: false,
      draft: null,
    });
    expect(target.href).toBe("/living-hope");
    expect(target.headline).toContain("foundation");
  });

  it("shows continue copy when a draft is in progress", () => {
    const target = getMorningFormulaEntryTarget({
      ritualReady: true,
      reviewedToday: false,
      draft: {
        reviewDate: localDateISO(),
        expressMode: false,
        guidedMode: true,
        stepIndex: 3,
        totalSteps: 12,
        stepLabel: "Scripture",
        inProgress: true,
      },
    });
    expect(target.href).toBe("/living-hope/review");
    expect(target.headline).toContain("Continue step 4 of 12");
    expect(target.subline).toBe("Scripture");
  });

  it("uses guided copy for a fresh ritual", () => {
    const target = getMorningFormulaEntryTarget({
      ritualReady: true,
      reviewedToday: false,
      draft: null,
      isMorning: true,
    });
    expect(target.href).toBe("/living-hope/review");
    expect(target.subline).toContain("Guided worship");
  });

  it("preserves structured mode in draft continue href", () => {
    const target = getMorningFormulaEntryTarget({
      ritualReady: true,
      reviewedToday: false,
      draft: {
        reviewDate: localDateISO(),
        expressMode: false,
        guidedMode: false,
        stepIndex: 2,
        totalSteps: 12,
        stepLabel: "Thanks",
        inProgress: true,
      },
    });
    expect(target.href).toBe("/living-hope/review?mode=structured");
  });
});

describe("morningRitualDraft", () => {
  const userId = "test-user-draft";

  it("saves and loads today's draft", () => {
    const steps = buildExpressRitualSteps();
    saveMorningRitualDraft(userId, {
      expressMode: true,
      guidedMode: false,
      stepIndex: 3,
      steps,
      goalIndex: 0,
      goalTotal: 0,
      touches: {},
      visionRecall: "",
      storyRecall: "",
      metricValues: {},
      thanksgivingNow: ["Grace", "", "", "", ""],
      thanksgivingNotYet: ["", "", "", "", ""],
      scriptureReflection: "Mercy",
      dailyAssignment: { spiritual: "Pray", family: "", business: "" },
      surrender: "",
      covering: "",
      storySelectedIndex: null,
    });

    const draft = loadMorningRitualDraft(userId);
    expect(draft?.reviewDate).toBe(localDateISO());
    expect(draft?.expressMode).toBe(true);
    expect(draft?.scriptureReflection).toBe("Mercy");
    expect(draft?.stepLabel).toBe("Scripture");

    const summary = summarizeMorningRitualDraft(draft);
    expect(summary?.inProgress).toBe(true);
    expect(summary?.stepLabel).toBe("Scripture");
  });

  it("resolveDraftStepIndex prefers step key when step list changes", () => {
    const steps = buildRitualSteps(null, [], false);
    const scriptureIdx = steps.findIndex((s) => s.kind === "scripture");
    const draft = {
      reviewDate: localDateISO(),
      expressMode: false,
      guidedMode: true,
      stepIndex: 99,
      stepKey: "scripture",
      stepLabel: "Scripture",
      totalSteps: steps.length,
      touches: {},
      visionRecall: "",
      storyRecall: "",
      metricValues: {},
      thanksgivingNow: ["", "", "", "", ""],
      thanksgivingNotYet: ["", "", "", "", ""],
      scriptureReflection: "",
      dailyAssignment: { spiritual: "", family: "", business: "" },
      surrender: "",
      covering: "",
      storySelectedIndex: null,
      updatedAt: new Date().toISOString(),
    };
    expect(resolveDraftStepIndex(draft, steps)).toBe(scriptureIdx);
  });
});

describe("buildExpressRitualSteps", () => {
  it("skips alignment and surrender steps", () => {
    const kinds = buildExpressRitualSteps().map((s) => s.kind);
    expect(kinds).toEqual([
      "intro",
      "worship",
      "thanksgiving",
      "scripture",
      "prayer",
      "assignment",
      "done",
    ]);
  });
});
