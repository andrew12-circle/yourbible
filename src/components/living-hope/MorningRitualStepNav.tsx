import { useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { ritualStepKey, ritualStepLabel, type RitualStep } from "@/lib/livingHope/morningRitual";
import { morningStepProgress } from "@/lib/livingHope/morningSession";
import { cn } from "@/lib/utils";

type Props = {
  steps: RitualStep[];
  stepIndex: number;
  goalTotal: number;
  onStepIndexChange: (index: number) => void;
  disabled?: boolean;
};

export function MorningRitualStepNav({ steps, stepIndex, goalTotal, onStepIndexChange, disabled }: Props) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const { activities, position, total } = morningStepProgress(steps, stepIndex);

  useEffect(() => {
    if (disclosure.current) disclosure.current.open = false;
  }, [stepIndex]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !disclosure.current?.contains(event.target) && disclosure.current) {
        disclosure.current.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !disclosure.current?.open) return;
      disclosure.current.open = false;
      disclosure.current.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (steps[stepIndex]?.kind === "done") return null;
  return (
    <nav className="morning-step-nav" aria-label="Morning session navigation">
      <p className="morning-step-count">{position ? `Step ${position} of ${total}` : "At your own pace"}</p>
      <details ref={disclosure} className="morning-step-disclosure">
        <summary>All steps<ChevronDown className="h-4 w-4" aria-hidden="true" /></summary>
        <ol aria-label="Morning formula steps" className="morning-step-menu">
          {activities.map(({ step, index }) => (
            <li key={ritualStepKey(step)}>
              <button
                type="button"
                disabled={disabled || index > stepIndex}
                aria-current={index === stepIndex ? "step" : undefined}
                className={cn("morning-step-option", index === stepIndex && "is-current")}
                onClick={() => {
                  if (disabled || index > stepIndex) return;
                  onStepIndexChange(index);
                  if (disclosure.current) disclosure.current.open = false;
                }}
              >
                <span>{ritualStepLabel(step, activities.filter((s) => s.step.kind === "goal").findIndex((s) => s.index === index), goalTotal)}</span>
                {index < stepIndex && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ol>
      </details>
      <div
        role="progressbar"
        aria-label="Morning progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={position}
        aria-valuetext={position ? `Step ${position} of ${total}` : "Ready to begin"}
        className="morning-step-track"
      >
        {activities.map(({ step, index }) => (
          <span key={ritualStepKey(step)} aria-hidden="true" className={cn(
            "morning-step-marker",
            index < stepIndex && "is-complete",
            index === stepIndex && "is-current",
          )}><span /></span>
        ))}
      </div>
    </nav>
  );
}
