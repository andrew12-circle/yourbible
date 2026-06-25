import { Lock } from "lucide-react";
import type { HabitBadgeDef } from "@/lib/habits/badges";
import { cn } from "@/lib/utils";

type Props = {
  badge: HabitBadgeDef;
  unlocked: boolean;
  unlockedAt?: string | null;
  compact?: boolean;
};

const TIER_RING: Record<HabitBadgeDef["tier"], string> = {
  bronze: "ring-amber-600/40",
  silver: "ring-slate-300/50",
  gold: "ring-yellow-400/50",
  platinum: "ring-white/60",
};

export function HabitBadgeCard({ badge, unlocked, unlockedAt, compact }: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-sm",
        compact ? "w-full shrink-0" : "min-w-[140px] flex-1",
        unlocked ? `border-white/20 ring-2 ${TIER_RING[badge.tier]}` : "border-zinc-200/80 opacity-75",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          badge.gradient,
          !unlocked && "grayscale saturate-50 brightness-75",
        )}
      />
      <div className="relative p-3 flex flex-col gap-1 min-h-[88px]">
        <div className="flex items-start justify-between gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
            {badge.tier}
          </span>
          {!unlocked ? <Lock className="w-3.5 h-3.5 text-white/70 shrink-0" /> : null}
        </div>
        <p className="text-sm font-bold text-white leading-tight drop-shadow-sm">{badge.title}</p>
        {!compact ? (
          <p className="text-[10px] text-white/85 leading-snug line-clamp-2">{badge.description}</p>
        ) : null}
        {unlocked && unlockedAt ? (
          <p className="text-[9px] text-white/70 mt-auto tabular-nums">
            {new Date(unlockedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
