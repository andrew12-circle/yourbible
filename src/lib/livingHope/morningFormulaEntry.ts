import { MORNING_FORMULA_TAGLINE } from "@/lib/livingHope/morningRitual";
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
    const query = opts.draft.expressMode ? "?mode=express" : "";
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
      subline: MORNING_FORMULA_TAGLINE,
    };
  }

  return {
    href: "/living-hope/review",
    headline: isMorning ? "Start today's formula" : "Review your vision",
    subline: MORNING_FORMULA_TAGLINE,
  };
}
