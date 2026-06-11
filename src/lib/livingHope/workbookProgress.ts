import type { LivingHopeGoalRow, LivingHopeLetterRow } from "@/lib/livingHope/api";
import { localDateISO } from "@/lib/lifePriorities";
import {
  WORKBOOK_SECTIONS,
  type LivingHopeWorkbookContent,
  type WorkbookPhase,
  type WorkbookSection,
} from "@/lib/livingHope/workbookTypes";

export const RITUAL_STEPS = [
  { key: "manifesto", label: "Manifesto" },
  { key: "vision", label: "Vision" },
  { key: "story", label: "Story" },
  { key: "goals", label: "Goals" },
  { key: "surrender", label: "Surrender" },
] as const;

export function livingHopeDaySeed(): number {
  const iso = localDateISO();
  return iso.split("-").reduce((a, b) => a + Number(b), 0);
}

function sectionFilled(workbook: LivingHopeWorkbookContent, key: WorkbookSection): boolean {
  switch (key) {
    case "manifesto":
      return workbook.manifesto.some((m) => m.text.trim().length > 0);
    case "vision":
      return workbook.vision_headline.trim().length > 0 || workbook.income_lines.length > 0;
    case "stories":
      return workbook.stories.some((s) => s.text.trim().length > 0);
    case "quotes":
      return workbook.quotes.some((q) => q.text.trim().length > 0);
    case "lifestyle":
      return workbook.lifestyle.length > 0;
    case "routine":
      return workbook.routine.length > 0;
    case "business":
      return workbook.business_targets.length > 0;
    case "standards":
      return workbook.financial_standards.length > 0;
    case "family":
      return workbook.family_leadership.length > 0;
    case "rules":
      return workbook.rules_of_operation.length > 0;
    case "weekly":
      return workbook.weekly_questions.length > 0;
    case "metrics":
      return workbook.metrics.length > 0;
  }
}

function letterFilled(letter: LivingHopeLetterRow | null): boolean {
  if (!letter) return false;
  if (letter.status !== "draft") return true;
  return !!(
    letter.full_letter?.trim() ||
    letter.outlook?.trim() ||
    letter.mission_statement?.trim()
  );
}

export function getPhaseProgress(
  phase: WorkbookPhase,
  workbook: LivingHopeWorkbookContent,
  letter: LivingHopeLetterRow | null,
): { filled: number; total: number } {
  const sections = WORKBOOK_SECTIONS.filter((s) => s.phase === phase);
  const sectionFilledCount = sections.filter((s) => sectionFilled(workbook, s.key)).length;
  if (phase === "anchor") {
    const letterDone = letterFilled(letter) ? 1 : 0;
    return { filled: sectionFilledCount + letterDone, total: sections.length + 1 };
  }
  return { filled: sectionFilledCount, total: sections.length };
}

export function isRitualReady(
  workbook: LivingHopeWorkbookContent | null,
  goals: LivingHopeGoalRow[],
): boolean {
  if (!workbook) return false;
  const activeGoals = goals.filter((g) => g.status === "active");
  return (
    workbook.manifesto.some((m) => m.text.trim()) ||
    workbook.vision_headline.trim().length > 0 ||
    workbook.income_lines.length > 0 ||
    workbook.stories.some((s) => s.text.trim()) ||
    activeGoals.length > 0
  );
}

export function getWorkbookReadiness(
  workbook: LivingHopeWorkbookContent | null,
  goals: LivingHopeGoalRow[],
  letter: LivingHopeLetterRow | null,
): {
  percent: number;
  ritualReady: boolean;
  nextStep: { label: string; href: string } | null;
} {
  if (!workbook) {
    return { percent: 0, ritualReady: false, nextStep: { label: "Add manifesto lines", href: "/living-hope/workbook/manifesto" } };
  }

  const phases: WorkbookPhase[] = ["anchor", "see", "move"];
  let filled = 0;
  let total = 0;
  for (const phase of phases) {
    const prog = getPhaseProgress(phase, workbook, letter);
    filled += prog.filled;
    total += prog.total;
  }
  total += 1;
  if (goals.filter((g) => g.status === "active").length > 0) filled += 1;

  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  const ritualReady = isRitualReady(workbook, goals);

  let nextStep: { label: string; href: string } | null = null;
  if (!workbook.manifesto.some((m) => m.text.trim())) {
    nextStep = { label: "Add manifesto lines", href: "/living-hope/workbook/manifesto" };
  } else if (!workbook.vision_headline.trim() && workbook.income_lines.length === 0) {
    nextStep = { label: "Write your vision", href: "/living-hope/workbook/vision" };
  } else if (!workbook.stories.some((s) => s.text.trim())) {
    nextStep = { label: "Add daily stories", href: "/living-hope/workbook/stories" };
  } else if (goals.filter((g) => g.status === "active").length === 0) {
    nextStep = { label: "Set fractal goals", href: "/living-hope/letter" };
  }

  return { percent, ritualReady, nextStep };
}

export function getTodayPreview(workbook: LivingHopeWorkbookContent, seed = livingHopeDaySeed()) {
  const manifesto = workbook.manifesto.length
    ? workbook.manifesto[seed % workbook.manifesto.length]
    : null;
  const story = workbook.stories.length ? workbook.stories[seed % workbook.stories.length] : null;
  return { manifesto, story };
}

export function isSectionComplete(
  workbook: LivingHopeWorkbookContent,
  key: WorkbookSection,
): boolean {
  return sectionFilled(workbook, key);
}
