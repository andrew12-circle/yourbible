import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { ritualStepKey, ritualStepLabel, type RitualStep } from "@/lib/livingHope/morningRitual";
import { morningStepProgress } from "@/lib/livingHope/morningSession";
import { cn } from "@/lib/utils";

type Props = { steps: RitualStep[]; stepIndex: number; goalTotal: number; onStepIndexChange: (index: number) => void; disabled?: boolean };
export function MorningRitualStepNav({ steps, stepIndex, goalTotal, onStepIndexChange, disabled }: Props) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const { activities, position, total } = morningStepProgress(steps, stepIndex);
  if (steps[stepIndex]?.kind === "done") return null;
  return <div className="mb-7 space-y-3">
    <div className="flex items-start justify-between gap-3 text-sm text-muted-foreground">
      <p className="pt-3 tabular-nums">{position ? `Step ${position} of ${total}` : "At your own pace"}</p>
      <details ref={disclosure} className="relative max-w-[70%]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-end gap-2 rounded-lg px-2 focus-visible:ring-2 focus-visible:ring-ring">All steps<ChevronDown className="h-4 w-4" aria-hidden /></summary>
        <ol aria-label="Morning formula steps" className="mt-2 space-y-1 rounded-2xl border border-border/60 bg-card p-2">
          {activities.map(({ step, index }) => <li key={ritualStepKey(step)}>
            <button type="button" disabled={disabled || index > stepIndex} aria-current={index === stepIndex ? "step" : undefined}
              className={cn("min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm disabled:opacity-45", index === stepIndex ? "bg-muted font-semibold text-foreground" : "hover:bg-muted")}
              onClick={() => { if (index <= stepIndex) { onStepIndexChange(index); if (disclosure.current) disclosure.current.open = false; } }}>
              {ritualStepLabel(step, activities.filter((s) => s.step.kind === "goal").findIndex((s) => s.index === index), goalTotal)}
            </button>
          </li>)}
        </ol>
      </details>
    </div>
    <div role="progressbar" aria-label="Morning progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={position}
      className="h-0.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-foreground/60 transition-[width] motion-reduce:transition-none" style={{ width: `${total ? position / total * 100 : 0}%` }} />
    </div>
  </div>;
}
