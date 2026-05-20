import { Flame, Target, Zap } from "lucide-react";
import type { TopHabitStreak } from "@/lib/habits/overallStreak";
import { cn } from "@/lib/utils";

type Props = {
  activeStreak: number;
  perfectStreak: number;
  topHabits: TopHabitStreak[];
};

export function HabitStreakSummary({ activeStreak, perfectStreak, topHabits }: Props) {
  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      <StreakPill
        icon={Flame}
        label="Active days"
        value={activeStreak}
        sub="days in a row"
        accent="text-orange-500 bg-orange-500/10"
      />
      <StreakPill
        icon={Target}
        label="Perfect days"
        value={perfectStreak}
        sub="all habits"
        accent="text-emerald-500 bg-emerald-500/10"
      />
      {topHabits[0] ? (
        <StreakPill
          icon={Zap}
          label="Top streak"
          value={topHabits[0].current}
          sub={topHabits[0].name}
          accent="text-violet-500 bg-violet-500/10"
          className="col-span-2 sm:col-span-1"
        />
      ) : null}
    </section>
  );
}

function StreakPill({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  className,
}: {
  icon: typeof Flame;
  label: string;
  value: number;
  sub: string;
  accent: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200/80 bg-white/90 backdrop-blur px-3.5 py-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cn("w-7 h-7 rounded-full flex items-center justify-center", accent)}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</p>
    </div>
  );
}
