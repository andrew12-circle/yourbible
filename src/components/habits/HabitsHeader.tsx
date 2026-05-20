import { ActivityRings } from "@/components/habits/ActivityRings";
import type { RingStats } from "@/lib/habits/ringStats";
import type { MonthStats } from "@/lib/habits/stats";
import { cn } from "@/lib/utils";

type Props = {
  monthLabel: string;
  stats: MonthStats;
  rings: RingStats;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoNext: boolean;
};

const RING_LABELS = [
  { key: "move" as const, label: "Today", color: "bg-[#FA114F]" },
  { key: "exercise" as const, label: "Week", color: "bg-[#92E82A]" },
  { key: "stand" as const, label: "Month", color: "bg-[#00D4FF]" },
];

export function HabitsHeader({ monthLabel, stats, rings, onPrevMonth, onNextMonth, canGoNext }: Props) {
  const weeks = Object.entries(stats.weeklyPct).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="rounded-[22px] bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-white shadow-lg overflow-hidden">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onPrevMonth}
            className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95 transition hover:bg-white/15"
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className="text-base font-semibold tracking-tight capitalize">{monthLabel}</h2>
          <button
            type="button"
            onClick={onNextMonth}
            disabled={!canGoNext}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition",
              canGoNext ? "bg-white/10 text-white hover:bg-white/15" : "bg-white/5 text-white/30",
            )}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-5">
          <ActivityRings
            size={132}
            values={{
              move: rings.todayPct,
              exercise: rings.weekPct,
              stand: rings.monthPct,
            }}
          />
          <div className="flex-1 min-w-0 space-y-3">
            {RING_LABELS.map(({ key, label, color }) => {
              const pct = key === "move" ? rings.todayPct : key === "exercise" ? rings.weekPct : rings.monthPct;
              const detail =
                key === "move"
                  ? `${rings.todayDone}/${rings.todayTotal} habits`
                  : key === "exercise"
                    ? "this week"
                    : `${stats.completedCells} check-ins`;
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                    <span className="text-xs font-medium text-white/70">{label}</span>
                    <span className="ml-auto text-sm font-bold tabular-nums">{pct}%</span>
                  </div>
                  <p className="text-[10px] text-white/50 pl-4 truncate">{detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {weeks.length > 0 ? (
        <div className="px-4 pb-4 pt-0 border-t border-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2 pt-3">
            Weekly progress
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {weeks.map(([week, pct]) => (
              <div key={week} className="shrink-0 flex-1 min-w-[52px] text-center">
                <div className="h-1 rounded-full bg-white/15 overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full bg-[#92E82A] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[9px] text-white/50">W{week}</span>
                <span className="block text-xs font-semibold tabular-nums">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
