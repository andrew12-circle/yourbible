import type { MorningRitualDraftSummary } from "@/lib/livingHope/morningRitualDraft";

export interface MorningFormulaEntryTarget {
  href: string;
  headline: string;
  subline: string;
}

export function getMorningFormulaEntryTarget(opts: {
  ritualReady: boolean;
  reviewedToday: boolean;
  draft: MorningRitualDraftSummary | null;
  isMorning?: boolean;
}): MorningFormulaEntryTarget {
  const isMorning = opts.isMorning ?? new Date().getHours() < 12;

  if (opts.draft?.inProgress) {
    const stepNum = opts.draft.stepIndex + 1;
    const params = new URLSearchParams();
    if (opts.draft.expressMode) params.set("mode", "express");
    else if (!opts.draft.guidedMode) params.set("mode", "structured");
    const query = params.toString() ? `?${params.toString()}` : "";
    return {
      href: `/living-hope/review${query}`,
      headline: `Continue step ${stepNum} of ${opts.draft.totalSteps}`,
      subline: opts.draft.stepLabel,
    };
  }

  if (!opts.ritualReady) {
    return {
      href: "/living-hope",
      headline: "Build your foundation",
      subline: "Manifesto, vision, and goals — then review each morning",
    };
  }

  if (opts.reviewedToday) {
    return {
      href: "/living-hope/review",
      headline: "Review again",
      subline: "Guided morning · or switch to structured view",
    };
  }

  return {
    href: "/living-hope/review",
    headline: isMorning ? "Start today's formula" : "Review your vision",
    subline: "Guided worship → thanks → scripture → prayer → align → surrender",
  };
}
