import { Timer } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatFormulaCountdown,
  SESSION_DURATION_OPTIONS,
  type SessionDurationMin,
} from "@/lib/livingHope/morningFormulaTimer";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  durationMin: SessionDurationMin;
  onDurationChange: (next: SessionDurationMin) => void;
  stepRemainingMs: number;
  sessionRemainingMs: number;
  stepExpired: boolean;
  visible: boolean;
};

export function MorningFormulaDurationPicker({
  durationMin,
  onDurationChange,
}: Pick<Props, "durationMin" | "onDurationChange">) {
  return (
    <div className="space-y-2">
      <p className={cn(lh.label, "mb-0")}>How long do you have?</p>
      <div className="flex gap-1.5">
        {SESSION_DURATION_OPTIONS.map((option) => {
          const active = durationMin === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onDurationChange(option)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-[13px] font-semibold tabular-nums transition-colors",
                active
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {option} min
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MorningFormulaSessionTimer({
  durationMin,
  onDurationChange,
  stepRemainingMs,
  sessionRemainingMs,
  stepExpired,
  visible,
}: Props) {
  if (!visible) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex flex-col items-end rounded-lg px-2 py-1 text-right transition-colors",
            "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
            stepExpired && "animate-pulse",
          )}
          aria-label={`Step timer ${formatFormulaCountdown(stepRemainingMs)}, ${formatFormulaCountdown(sessionRemainingMs)} left in session`}
        >
          <span
            className={cn(
              "text-[15px] font-semibold tabular-nums leading-none",
              stepExpired ? "text-amber-600 dark:text-amber-400" : "text-foreground",
            )}
          >
            {formatFormulaCountdown(stepRemainingMs)}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums leading-tight mt-0.5">
            {formatFormulaCountdown(sessionRemainingMs)} left
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="h-4 w-4 text-amber-600" aria-hidden />
          <p className="text-[13px] font-semibold">Session pace</p>
        </div>
        <p className={cn(lh.footnote, "mb-3")}>
          Finish the whole formula in your chosen time. Each step gets a countdown to keep you moving.
        </p>
        <div className="flex gap-1.5">
          {SESSION_DURATION_OPTIONS.map((option) => {
            const active = durationMin === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onDurationChange(option)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-[12px] font-semibold tabular-nums transition-colors",
                  active
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {option}m
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
