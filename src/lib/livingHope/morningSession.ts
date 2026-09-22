import { ritualStepLabel, type RitualStep } from "./morningRitual";

/** Labels describe the destination, never a timer or a save that has not happened. */
export function morningNextLabel(steps: RitualStep[], index: number): string {
  const next = steps[index + 1];
  if (!next || next.kind === "done") return "Complete my morning";
  if (steps[index]?.kind === "intro") return "Begin with worship";
  if (next.kind === "goal") return `Continue to goal ${steps.slice(0, index + 2).filter((item) => item.kind === "goal").length} of ${steps.filter((item) => item.kind === "goal").length}`;
  const titles: Partial<Record<RitualStep["kind"], string>> = {
    thanksgiving: "Gratitude", prayer: "Prayer & journal", assignment: "Today's priorities",
  };
  return `Continue to ${titles[next.kind] ?? ritualStepLabel(next)}`;
}

export function morningStepProgress(steps: RitualStep[], index: number) {
  const activities = steps.map((step, i) => ({ step, index: i }))
    .filter(({ step }) => step.kind !== "intro" && step.kind !== "done");
  return { activities, position: activities.filter((s) => s.index <= index).length, total: activities.length };
}
