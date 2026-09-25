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
  return `Good morning, ${name}. Take a moment to settle in. One step at a time, at your own pace.`;
}

export const GUIDED_COACH_COPY: Record<
  Exclude<GuidedCoachBeat, "intro" | "worship_start" | "done">,
  string
> = {
  thanks: "Notice what you have received, and make room for gratitude.",
  scripture: "Read slowly. Let the Scripture speak first.",
  prayer: "Bring what is on your heart before God. Speak honestly, then listen.",
  manifesto: "Speak your manifesto slowly. Let it land.",
  vision: "Pick one saved scene. Enter it in first person — see it, hear it, feel it, rehearse it, and return with one action.",
  story: "The visualization is over. Bring one specific action back into the day you are actually living.",
  surrender: "You've seen the life. Now release the grip — hold every hope open-handed.",
  covering: "Cover yourself and your house. Pray this aloud.",
  assignment: "What does God want you to do today — abide, build the temple, family, and work?",
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
