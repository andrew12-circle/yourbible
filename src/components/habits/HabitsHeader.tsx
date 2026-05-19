import { ProgressRing } from "@/components/habits/ProgressRing";
import type { MonthStats } from "@/lib/habits/stats";
import { cn } from "@/lib/utils";

type Props = {
  monthLabel: string;
  stats: MonthStats;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoNext: boolean;
};

export function HabitsHeader({ monthLabel, stats, onPrevMonth, onNextMonth, canGoNext }: Props) {
  const categoryPct = stats.categoryPct["All habits"] ?? stats.activeDaysPct;
  const weeks = Object.entries(stats.weeklyPct).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="rounded-[22px] bg-white/80 backdrop-blur-xl border border-zinc-200/80 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onPrevMonth} className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center active:scale-95 transition" aria-label="Previous month">‹</button>
        <h2 className="text-base font-semibold tracking-tight capitalize">{monthLabel}</h2>
        <button type="button" onClick={onNextMonth} disabled={!canGoNext} className={cn("w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition", canGoNext ? "bg-zinc-100 text-zinc-700" : "bg-zinc-50 text-zinc-300")} aria-label="Next month">›</button>
      </div>
      <div className="flex items-center gap-4">
        <ProgressRing value={stats.activeDaysPct} size={80} label="Active" />
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Active days</span>
              <span className="text-sm font-semibold tabular-nums">{stats.activeDaysPct}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{stats.completedCells} of {stats.possibleCells} check-ins</p>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Habit success</span>
              <span className="text-sm font-semibold tabular-nums">{categoryPct}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">Average across categories</p>
          </div>
        </div>
      </div>
      {weeks.length > 0 ? (
        <div className="pt-1 border-t border-zinc-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Weekly done</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {weeks.map(([week, pct]) => (
              <div key={week} className="shrink-0 flex-1 min-w-[56px] text-center">
                <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden mb-1">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">W{week}</span>
                <span className="block text-xs font-semibold tabular-nums">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
