import { morningStepProgress } from "./morningSession";
import type { RitualStep } from "./morningRitual";

/** Presentation only: never changes the ritual order, timers, or saved answers. */
export const MORNING_ATMOSPHERE: Record<RitualStep["kind"], { subtitle: string; reminder: string }> = {
  intro: { subtitle: "Choose your pace. Make room for a morning with God.", reminder: "Come as you are." },
  worship: { subtitle: "Put on your worship music. Take a breath and turn your attention to God.", reminder: "Presence, not performance." },
  thanksgiving: { subtitle: "Notice the gifts of today. Bring tomorrow's hopes with open hands.", reminder: "Make room for gratitude." },
  scripture: { subtitle: "Read slowly. Listen closely. Carry one truth into your day.", reminder: "Let the Word take root." },
  prayer: { subtitle: "Bring what is on your heart. Speak honestly, then make space to listen.", reminder: "You do not need perfect words." },
  manifesto: { subtitle: "Return to the truths and commitments that shape who you are becoming.", reminder: "Rooted in truth." },
  vision: { subtitle: "Practice the person you want to become and the next action you can take.", reminder: "See clearly. Live faithfully." },
  story: { subtitle: "Step into your chosen scene. Notice the details and rehearse a faithful response.", reminder: "Imagine. Practice. Take one step." },
  surrender: { subtitle: "Hold your hopes with open hands. Release what you cannot control.", reminder: "Trust beyond the outcome." },
  covering: { subtitle: "Pray over your heart, your home, and the day ahead.", reminder: "Move forward in peace." },
  assignment: { subtitle: "Bring together what surfaced this morning and choose what matters today.", reminder: "One faithful next step." },
  goal: { subtitle: "Connect a long-term hope with one practical act of obedience today.", reminder: "Small steps. Lasting change." },
  metrics: { subtitle: "Notice your progress honestly. Record what helps you steward the day.", reminder: "Pay attention to what matters." },
  done: { subtitle: "Take what you received into the rest of your day.", reminder: "Carry this morning with you." },
};

/** Current activities are not counted as completed; setup readiness is a different measure. */
export function morningJourneyProgress(steps: RitualStep[], stepIndex: number, finished: boolean) {
  const { activities, position, total } = morningStepProgress(steps, stepIndex);
  const completed = finished ? total : activities.filter(({ index }) => index < stepIndex).length;
  return {
    position,
    total,
    completed,
    percent: total ? Math.min(100, Math.round((completed / total) * 100)) : 0,
  };
}
