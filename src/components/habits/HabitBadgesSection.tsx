import { Award } from "lucide-react";
import { HabitBadgeCard } from "@/components/habits/HabitBadgeCard";
import { HABIT_BADGE_DEFS } from "@/lib/habits/badges";
import type { HabitBadgeRow } from "@/lib/habits/badgesApi";

type Props = {
  unlocked: HabitBadgeRow[];
};

export function HabitBadgesSection({ unlocked }: Props) {
  const unlockedMap = new Map(unlocked.map((r) => [r.badge_id, r.unlocked_at]));
  const unlockedCount = HABIT_BADGE_DEFS.filter((b) => unlockedMap.has(b.id)).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold tracking-tight">Awards</h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {unlockedCount}/{HABIT_BADGE_DEFS.length}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2.5">
        {HABIT_BADGE_DEFS.map((badge) => (
          <HabitBadgeCard
            key={badge.id}
            badge={badge}
            unlocked={unlockedMap.has(badge.id)}
            unlockedAt={unlockedMap.get(badge.id)}
            compact
          />
        ))}
      </div>
    </section>
  );
}
