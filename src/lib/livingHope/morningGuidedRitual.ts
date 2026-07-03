import type { RitualStep } from "@/lib/livingHope/morningRitual";

/** Worship music runs ~10 minutes before thanks. */
export const GUIDED_WORSHIP_MS = 10 * 60 * 1000;

/** Scripture reading target — at least 15 minutes. */
export const GUIDED_SCRIPTURE_MS = 15 * 60 * 1000;

export type GuidedCoachBeat =
  | "intro"
  | "worship_start"
  | "thanks"
  | "scripture"
  | "prayer"
  | "manifesto"
  | "vision"
  | "story"
  | "surrender"
  | "covering"
  | "assignment"
  | "goals"
  | "metrics"
  | "done";

export function guidedCoachBeatForStep(step: RitualStep): GuidedCoachBeat | null {
  switch (step.kind) {
    case "intro":
      return "intro";
    case "worship":
      return "worship_start";
    case "thanksgiving":
      return "thanks";
    case "scripture":
      return "scripture";
    case "prayer":
      return "prayer";
    case "manifesto":
      return "manifesto";
    case "vision":
      return "vision";
    case "story":
      return "story";
    case "surrender":
      return "surrender";
    case "covering":
      return "covering";
    case "assignment":
      return "assignment";
    case "goal":
      return "goals";
    case "metrics":
      return "metrics";
    case "done":
      return "done";
    default:
      return null;
  }
}

export function buildGuidedIntroMessage(formalName: string): string {
  const name = formalName.trim() || "friend";
  return [
    `Good morning, ${name}. Let's start our day off right.`,
    "I'll take you through worship, thanks, scripture, prayer, manifesto, vision, stories, and surrender today.",
    "We'll take this one step at a time.",
  ].join(" ");
}

export const GUIDED_COACH_COPY: Record<
  Exclude<GuidedCoachBeat, "intro" | "worship_start" | "done">,
  string
> = {
  thanks: "Okay, let's give thanks and go.",
  scripture: "Okay, let's hear from our Lord and Savior.",
  prayer: "Let's bring what's on your heart before Him — I'll help you craft prayers that feel personal.",
  manifesto: "Speak your manifesto slowly. Let it land.",
  vision: "Step into the life you're building. Answer each question as if you're already there.",
  story: "This is the story you'll be living out — inhabit it.",
  surrender: "You've seen the life. Now release the grip — hold every hope open-handed.",
  covering: "Cover yourself and your house. Pray this aloud.",
  assignment: "What does God want you to do today — spiritual, family, and business?",
  goals: "One vivid picture and one obedience step for this goal.",
  metrics: "Log today's numbers — honest, not performative.",
};

export function formatGuidedCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.ceil(msRemaining / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function formatGuidedElapsed(ms: number): string {
  return formatGuidedCountdown(ms);
}

export function scriptureReadingComplete(elapsedMs: number, targetMs = GUIDED_SCRIPTURE_MS): boolean {
  return elapsedMs >= targetMs;
}

export function worshipPhaseComplete(elapsedMs: number, targetMs = GUIDED_WORSHIP_MS): boolean {
  return elapsedMs >= targetMs;
}
