import type { LivingHopeGoalRow } from "@/lib/livingHope/api";
import type { LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";

/** Connection-phase notes stored on `living_hope_reviews.connection_notes`. */
export interface DailyAssignment {
  spiritual: string;
  family: string;
  business: string;
}

export interface MorningConnectionNotes {
  worship_note?: string;
  thanksgiving_note?: string;
  prayer_note?: string;
  scripture_ref?: string;
  scripture_reflection?: string;
  daily_assignment?: DailyAssignment;
}

export const DEFAULT_SURRENDER_PRAYER = `Father, my business is Yours.

My family is Yours.

My systems are Yours.

My clients are Yours.

Direct my steps today.`;

export const WORSHIP_PROMPTS = [
  "Who God is",
  "His goodness",
  "His faithfulness",
  "His sovereignty",
] as const;

export const THANKSGIVING_PROMPTS = [
  "Salvation",
  "Family — Tish, Lilly, the new baby",
  "Your business and provision",
  "Lessons from yesterday",
] as const;

export const SCRIPTURE_QUESTIONS = [
  "What does this teach me about God?",
  "What does this reveal about me?",
  "Is there something to obey today?",
] as const;

export const PRAYER_PROMPTS = [
  "Business decisions",
  "Family leadership",
  "Finances",
  "Building the systems",
  "Hearing His voice",
] as const;

export const RITUAL_STEP_LABELS = [
  { key: "worship", label: "Worship" },
  { key: "thanks", label: "Thanks" },
  { key: "scripture", label: "Scripture" },
  { key: "pray", label: "Pray" },
  { key: "manifesto", label: "Manifesto" },
  { key: "vision", label: "Vision" },
  { key: "story", label: "Story" },
  { key: "surrender", label: "Surrender" },
  { key: "assignment", label: "Today" },
  { key: "goals", label: "Goals" },
] as const;

export type RitualStep =
  | { kind: "intro" }
  | { kind: "worship" }
  | { kind: "thanksgiving" }
  | { kind: "scripture" }
  | { kind: "prayer" }
  | { kind: "manifesto" }
  | { kind: "vision" }
  | { kind: "story" }
  | { kind: "assignment" }
  | { kind: "goal"; goalId: string }
  | { kind: "metrics" }
  | { kind: "surrender" }
  | { kind: "done" };

export function emptyDailyAssignment(): DailyAssignment {
  return { spiritual: "", family: "", business: "" };
}

export function emptyConnectionNotes(): MorningConnectionNotes {
  return { daily_assignment: emptyDailyAssignment() };
}

export function parseConnectionNotes(raw: unknown): MorningConnectionNotes {
  if (!raw || typeof raw !== "object") return emptyConnectionNotes();
  const o = raw as Record<string, unknown>;
  const da = o.daily_assignment;
  let daily_assignment = emptyDailyAssignment();
  if (da && typeof da === "object") {
    const d = da as Record<string, unknown>;
    daily_assignment = {
      spiritual: String(d.spiritual ?? ""),
      family: String(d.family ?? ""),
      business: String(d.business ?? ""),
    };
  }
  return {
    worship_note: o.worship_note ? String(o.worship_note) : undefined,
    thanksgiving_note: o.thanksgiving_note ? String(o.thanksgiving_note) : undefined,
    prayer_note: o.prayer_note ? String(o.prayer_note) : undefined,
    scripture_ref: o.scripture_ref ? String(o.scripture_ref) : undefined,
    scripture_reflection: o.scripture_reflection ? String(o.scripture_reflection) : undefined,
    daily_assignment,
  };
}

export function buildRitualSteps(
  workbook: LivingHopeWorkbookContent | null,
  activeGoals: LivingHopeGoalRow[],
): RitualStep[] {
  const steps: RitualStep[] = [{ kind: "intro" }];
  steps.push(
    { kind: "worship" },
    { kind: "thanksgiving" },
    { kind: "scripture" },
    { kind: "prayer" },
  );
  if (workbook?.manifesto.length) steps.push({ kind: "manifesto" });
  if (workbook?.vision_headline || workbook?.income_lines.length) steps.push({ kind: "vision" });
  if (workbook?.stories.length) steps.push({ kind: "story" });
  steps.push({ kind: "surrender" }, { kind: "assignment" });
  for (const g of activeGoals) steps.push({ kind: "goal", goalId: g.id });
  if (workbook?.metrics.length) steps.push({ kind: "metrics" });
  steps.push({ kind: "done" });
  return steps;
}

export function ritualStepSubtitle(step: RitualStep, goalIndex?: number, goalTotal?: number): string {
  switch (step.kind) {
    case "intro":
      return "Connection → alignment → action";
    case "worship":
      return "Worship";
    case "thanksgiving":
      return "Thanksgiving";
    case "scripture":
      return "Scripture";
    case "prayer":
      return "Conversation";
    case "manifesto":
      return "Manifesto";
    case "vision":
      return "Income vision";
    case "story":
      return "Daily story";
    case "assignment":
      return "Today's assignment";
    case "goal":
      return `Goal ${(goalIndex ?? 0) + 1} of ${goalTotal ?? 0}`;
    case "metrics":
      return "Metrics";
    case "surrender":
      return "Surrender";
    case "done":
      return "Execute";
    default:
      return "Morning formula";
  }
}
