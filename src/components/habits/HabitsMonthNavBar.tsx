import { cn } from "@/lib/utils";

type Props = {
  monthLabel: string;
  canGoNext: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  className?: string;
};

export function HabitsMonthNavBar({
  monthLabel,
  canGoNext,
  onPrevMonth,
  onNextMonth,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-2xl border border-zinc-200/80 bg-white/90 px-3 py-2 shadow-sm",
        className,
      )}
    >
      <button
        type="button"
        onClick={onPrevMonth}
        className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center active:scale-95 transition hover:bg-zinc-200"
        aria-label="Previous month"
      >
        ‹
      </button>
      <h2 className="text-sm font-semibold tracking-tight capitalize">{monthLabel}</h2>
      <button
        type="button"
        onClick={onNextMonth}
        disabled={!canGoNext}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition",
          canGoNext ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200" : "bg-zinc-50 text-zinc-300",
        )}
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}
