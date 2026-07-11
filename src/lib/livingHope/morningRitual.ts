import type { LivingHopeGoalRow } from "@/lib/livingHope/api";
import type { LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";

/** Connection-phase notes stored on `living_hope_reviews.connection_notes`. */
export interface DailyAssignment {
  spiritual: string;
  health: string;
  family: string;
  business: string;
}

export const DAILY_ASSIGNMENT_FIELDS: {
  key: keyof DailyAssignment;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "spiritual",
    label: "Abide — top 1 spiritual priority",
    placeholder: "e.g. Read James 1 at lunch",
  },
  {
    key: "health",
    label: "Build the temple — steward your body",
    placeholder: "e.g. Walk 20 min · bed by 10 · three real meals",
  },
  {
    key: "family",
    label: "Family — top 1 family priority",
    placeholder: "e.g. Finish Caroline's closet",
  },
  {
    key: "business",
    label: "Work — top 1 work priority",
    placeholder: "e.g. Fix the system outage",
  },
];

export interface MorningConnectionNotes {
  worship_note?: string;
  /** @deprecated Legacy single field — use thanksgiving_now / thanksgiving_not_yet */
  thanksgiving_note?: string;
  thanksgiving_now?: string[];
  thanksgiving_not_yet?: string[];
  /** Journal entry for the Conversation (prayer) step. */
  conversation_entry_id?: string;
  prayer_note?: string;
  scripture_ref?: string;
  scripture_reflection?: string;
  /** Embodied playthrough for today's chosen story scene. */
  story_recall?: string;
  /** Covering / warfare prayer prayed aloud after surrender. */
  covering_note?: string;
  daily_assignment?: DailyAssignment;
}

export const THANKSGIVING_ITEM_COUNT = 5;

export interface ThanksgivingLists {
  now: string[];
  notYet: string[];
}

export const DEFAULT_SURRENDER_PRAYER = `Father,

I come before You with open hands — not clenched fists.

Everything I just held in my spirit — the vision, the numbers, the rooms, the hopes for my family and my work — I do not clutch it. I offer it back to You. It was never mine to guarantee. It was Yours to steward through me.

You are sovereign over outcomes I cannot control.
You are good when the path is unclear.
You are Father when I am afraid.

I surrender my business — revenue, systems, clients, reputation, pace, and every plan I think I have figured out. Use it. Redirect it. Break it if You must, and rebuild something that glorifies You.

I surrender my family — their hearts, their safety, their futures, and my leadership in our home. I cannot write their story. I can only love them, tell them the truth, and obey You today.

I surrender my body — its energy, its limits, its sleep, its strength. Heal what needs healing. Rest what needs resting. Use what You give me without worshiping it.

I surrender my mind — the anxiety of what might not happen, the pride of what I think I have earned, the shame of what I have failed. Wash me clean. Reset my gaze on Christ.

I surrender today's schedule, today's conversations, today's wins and today's losses. Not my will — Yours.

If You give abundance, I will receive it with gratitude and give it away.
If You withhold or redirect, I will trust that You see what I cannot.
If You ask hard things, I will not run.

Jesus, in Gethsemane You prayed, "Not my will, but Yours be done."
Let that be my prayer over every hope I carry.

Holy Spirit, direct my steps today. Show me one faithful thing. I will do it as worship.

I release control. I receive Your peace.

Amen.`;

/** Framing copy for the surrender step — after vision/story, before assignment. */
export const SURRENDER_STEP_INTRO =
  "You have seen the life. Now release the grip. Like Jesus in Gethsemane — hold every hope open-handed. Pray slowly. Mean every line. Edit what is yours to say.";

export const SURRENDER_PRAYER_PROMPTS = [
  "What you are afraid will not happen",
  "What you are afraid will happen",
  "Outcomes, timing, and control",
  "Family, business, body, and mind",
  "Thy will — not mine",
] as const;

export const WORSHIP_PROMPTS = [
  "Who God is",
  "His goodness",
  "His faithfulness",
  "His sovereignty",
] as const;

export const THANKSGIVING_NOW_PROMPTS = [
  "Salvation",
  "Family — Tish, Lilly, the new baby",
  "Your business and provision",
  "Lessons from yesterday",
  "Health, home, or peace today",
] as const;

export const THANKSGIVING_NOT_YET_PROMPTS = [
  "Income or business milestones ahead",
  "Family dreams not yet realized",
  "Systems or team you're building toward",
  "Debt-free or abundance you're walking into",
  "Legacy and leadership you're growing into",
] as const;

/** @deprecated Use THANKSGIVING_NOW_PROMPTS */
export const THANKSGIVING_PROMPTS = THANKSGIVING_NOW_PROMPTS;

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
  "What you're afraid of",
  "What you need to surrender",
] as const;

export const CONVERSATION_LISTEN_PROMPT = "God, what do you want me to know today?";

/** Unified marketing copy — matches the full ritual arc (abbreviated on small surfaces). */
export const MORNING_FORMULA_TAGLINE =
  "Worship · thanks · scripture · pray · align · surrender · assign · execute";

export const MORNING_FORMULA_INTRO_FLOW =
  "Worship → thank → read → pray → align → surrender → cover → assign → execute";

export const ASSIGNMENT_VS_GOALS_HINT =
  "Today's assignment is what God wants today. Goal steps align each long-term aim with one obedience step.";

export const RITUAL_STEP_LABELS = [
  { key: "worship", label: "Worship" },
  { key: "thanks", label: "Thanks" },
  { key: "scripture", label: "Scripture" },
  { key: "pray", label: "Pray" },
  { key: "manifesto", label: "Manifesto" },
  { key: "vision", label: "Vision" },
  { key: "story", label: "Story" },
  { key: "surrender", label: "Surrender" },
  { key: "covering", label: "Covering" },
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
  | { kind: "covering" }
  | { kind: "done" };

export function emptyDailyAssignment(): DailyAssignment {
  return { spiritual: "", health: "", family: "", business: "" };
}

export function dailyAssignmentHasContent(assignment: DailyAssignment): boolean {
  return DAILY_ASSIGNMENT_FIELDS.some((field) => assignment[field.key].trim().length > 0);
}

export function dailyAssignmentDisplayLabel(key: keyof DailyAssignment): string {
  const field = DAILY_ASSIGNMENT_FIELDS.find((f) => f.key === key);
  if (!field) return key;
  return field.label.split(" — ")[0] ?? field.label;
}

export function emptyThanksgivingLists(): ThanksgivingLists {
  return {
    now: Array(THANKSGIVING_ITEM_COUNT).fill(""),
    notYet: Array(THANKSGIVING_ITEM_COUNT).fill(""),
  };
}

function normalizeThanksgivingList(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  const items = raw.map((x) => String(x ?? ""));
  while (items.length < THANKSGIVING_ITEM_COUNT) items.push("");
  return items.slice(0, THANKSGIVING_ITEM_COUNT);
}

export function parseThanksgivingLists(raw: unknown): ThanksgivingLists {
  const empty = emptyThanksgivingLists();
  if (!raw || typeof raw !== "object") return empty;
  const o = raw as Record<string, unknown>;
  const now = normalizeThanksgivingList(o.thanksgiving_now, empty.now);
  const notYet = normalizeThanksgivingList(o.thanksgiving_not_yet, empty.notYet);
  const legacy = o.thanksgiving_note ? String(o.thanksgiving_note).trim() : "";
  if (legacy && !now.some((s) => s.trim()) && !notYet.some((s) => s.trim())) {
    now[0] = legacy;
  }
  return { now, notYet };
}

export function formatThanksgivingJournalBody(lists: ThanksgivingLists): string | undefined {
  const nowLines = lists.now.map((s) => s.trim()).filter(Boolean);
  const notYetLines = lists.notYet.map((s) => s.trim()).filter(Boolean);
  if (!nowLines.length && !notYetLines.length) return undefined;

  const parts: string[] = [];
  if (nowLines.length) {
    parts.push(
      "### Thankful now\n\n" + nowLines.map((line, i) => `${i + 1}. ${line}`).join("\n"),
    );
  }
  if (notYetLines.length) {
    parts.push(
      "### Thankful for what has not yet come\n\n" +
        notYetLines.map((line, i) => `${i + 1}. ${line}`).join("\n"),
    );
  }
  return parts.join("\n\n");
}

export function thanksgivingListsFromNotes(notes: MorningConnectionNotes): ThanksgivingLists {
  return parseThanksgivingLists(notes);
}

export function compactThanksgivingLists(lists: ThanksgivingLists): {
  thanksgiving_now?: string[];
  thanksgiving_not_yet?: string[];
  thanksgiving_note?: string;
} {
  const now = lists.now.map((s) => s.trim());
  const notYet = lists.notYet.map((s) => s.trim());
  const hasNow = now.some(Boolean);
  const hasNotYet = notYet.some(Boolean);
  return {
    thanksgiving_now: hasNow ? now : undefined,
    thanksgiving_not_yet: hasNotYet ? notYet : undefined,
    thanksgiving_note: formatThanksgivingJournalBody(lists),
  };
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
      health: String(d.health ?? ""),
      family: String(d.family ?? ""),
      business: String(d.business ?? ""),
    };
  }
  return {
    worship_note: o.worship_note ? String(o.worship_note) : undefined,
    ...compactThanksgivingLists(parseThanksgivingLists(o)),
    thanksgiving_note: o.thanksgiving_note ? String(o.thanksgiving_note) : undefined,
    conversation_entry_id: o.conversation_entry_id ? String(o.conversation_entry_id) : undefined,
    prayer_note: o.prayer_note ? String(o.prayer_note) : undefined,
    scripture_ref: o.scripture_ref ? String(o.scripture_ref) : undefined,
    scripture_reflection: o.scripture_reflection ? String(o.scripture_reflection) : undefined,
    story_recall: o.story_recall ? String(o.story_recall) : undefined,
    covering_note: o.covering_note ? String(o.covering_note) : undefined,
    daily_assignment,
  };
}

export function buildExpressRitualSteps(): RitualStep[] {
  return [
    { kind: "intro" },
    { kind: "worship" },
    { kind: "thanksgiving" },
    { kind: "scripture" },
    { kind: "prayer" },
    { kind: "assignment" },
    { kind: "done" },
  ];
}

export function buildRitualSteps(
  workbook: LivingHopeWorkbookContent | null,
  activeGoals: LivingHopeGoalRow[],
  expressMode = false,
): RitualStep[] {
  if (expressMode) return buildExpressRitualSteps();

  const steps: RitualStep[] = [{ kind: "intro" }];
  steps.push(
    { kind: "worship" },
    { kind: "thanksgiving" },
    { kind: "scripture" },
    { kind: "prayer" },
  );
  if (workbook?.manifesto.length) steps.push({ kind: "manifesto" });
  if (workbook?.vision_headline || workbook?.income_lines.length) steps.push({ kind: "vision" });
  if (workbook) steps.push({ kind: "story" });
  steps.push({ kind: "surrender" }, { kind: "covering" }, { kind: "assignment" });
  for (const g of activeGoals) steps.push({ kind: "goal", goalId: g.id });
  if (workbook?.metrics.length) steps.push({ kind: "metrics" });
  steps.push({ kind: "done" });
  return steps;
}

export function ritualStepKey(step: RitualStep): string {
  if (step.kind === "goal") return `goal:${step.goalId}`;
  return step.kind;
}

export function ritualStepLabel(
  step: RitualStep,
  goalIndex?: number,
  goalTotal?: number,
): string {
  switch (step.kind) {
    case "intro":
      return "Intro";
    case "worship":
      return "Worship";
    case "thanksgiving":
      return "Thanks";
    case "scripture":
      return "Scripture";
    case "prayer":
      return "Pray";
    case "manifesto":
      return "Manifesto";
    case "vision":
      return "Vision";
    case "story":
      return "Story";
    case "assignment":
      return "Today";
    case "goal":
      return goalTotal && goalTotal > 1 ? `Goal ${(goalIndex ?? 0) + 1}` : "Goal";
    case "metrics":
      return "Metrics";
    case "surrender":
      return "Surrender";
    case "covering":
      return "Covering";
    case "done":
      return "Done";
    default:
      return "Step";
  }
}

export function clampRitualStepIndex(stepIndex: number, steps: RitualStep[]): number {
  if (!steps.length) return 0;
  return Math.max(0, Math.min(stepIndex, steps.length - 1));
}

export function ritualProgressRatio(stepIndex: number, steps: RitualStep[]): number {
  if (steps.length <= 1) return 0;
  return clampRitualStepIndex(stepIndex, steps) / (steps.length - 1);
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
      return "Embodied vision";
    case "story":
      return "Play a scene";
    case "assignment":
      return "Today's assignment";
    case "goal":
      return `Goal ${(goalIndex ?? 0) + 1} of ${goalTotal ?? 0}`;
    case "metrics":
      return "Metrics";
    case "surrender":
      return "Prayer of release";
    case "covering":
      return "Blood & warfare";
    case "done":
      return "Execute";
    default:
      return "Morning formula";
  }
}
