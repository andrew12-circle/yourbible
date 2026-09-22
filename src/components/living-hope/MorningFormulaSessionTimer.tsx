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
              aria-pressed={active}
              onClick={() => onDurationChange(option)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-[13px] font-semibold tabular-nums transition-colors",
                active
                  ? "bg-foreground text-background"
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
            "flex min-h-11 items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors",
            "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",

          )}
          aria-label={`Step pace: ${formatFormulaCountdown(stepRemainingMs)} remaining`}
        >
          <Timer className="h-4 w-4" aria-hidden />
          <span className="font-medium tabular-nums text-foreground">
            {stepExpired ? "Ready" : formatFormulaCountdown(stepRemainingMs)}
          </span>
          <span className="hidden sm:inline">step</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <p className="mb-3 text-sm tabular-nums">{stepExpired ? "Stay as long as you need." : `${formatFormulaCountdown(stepRemainingMs)} suggested for this step`} · {formatFormulaCountdown(sessionRemainingMs)} in your session</p>
        <div className="flex items-center gap-2 mb-3">
          <Timer className="h-4 w-4 text-amber-600" aria-hidden />
          <p className="text-[13px] font-semibold">Session pace</p>
        </div>
        <p className={cn(lh.footnote, "mb-3")}>
          This is a suggested pace, not a deadline. Continue when ready, change your session length here.
        </p>
        <div className="flex gap-1.5">
          {SESSION_DURATION_OPTIONS.map((option) => {
            const active = durationMin === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
              onClick={() => onDurationChange(option)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-[12px] font-semibold tabular-nums transition-colors",
                  active
                    ? "bg-foreground text-background"
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
