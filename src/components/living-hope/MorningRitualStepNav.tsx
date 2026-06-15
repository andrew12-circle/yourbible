import {
  clampRitualStepIndex,
  ritualStepKey,
  ritualStepLabel,
  type RitualStep,
} from "@/lib/livingHope/morningRitual";
import { cn } from "@/lib/utils";

type Props = {
  steps: RitualStep[];
  stepIndex: number;
  goalTotal: number;
  onStepIndexChange: (index: number) => void;
};

export function MorningRitualStepNav({ steps, stepIndex, goalTotal, onStepIndexChange }: Props) {
  const current = steps[stepIndex];
  if (!current || current.kind === "done") return null;

  const navigable = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.kind !== "done");

  if (navigable.length <= 2) return null;

  return (
    <div className="mb-4 -mx-1">
      <p className="px-1 mb-2 text-[12px] text-muted-foreground tabular-nums">
        Step {stepIndex + 1} of {steps.length}
        <span className="mx-1.5 text-muted-foreground/40">·</span>
        {ritualStepLabel(current, undefined, goalTotal)}
      </p>
      <div
        className="flex gap-1.5 overflow-x-auto scrollbar-hide px-1 pb-0.5"
        role="tablist"
        aria-label="Morning formula steps"
      >
        {navigable.map(({ step, index }) => {
          const isCurrent = index === stepIndex;
          const isPast = index < stepIndex;
          const label = ritualStepLabel(
            step,
            step.kind === "goal"
              ? steps.filter((s) => s.kind === "goal").findIndex((s) => ritualStepKey(s) === ritualStepKey(step))
              : undefined,
            goalTotal,
          );

          return (
            <button
              key={`${ritualStepKey(step)}-${index}`}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              aria-current={isCurrent ? "step" : undefined}
              disabled={index > stepIndex}
              onClick={() => {
                if (index <= stepIndex) onStepIndexChange(index);
              }}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                isCurrent
                  ? "bg-amber-500 text-white shadow-sm"
                  : isPast
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25"
                    : "bg-muted text-muted-foreground/60 cursor-not-allowed",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
