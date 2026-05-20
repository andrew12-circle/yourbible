import { perfectDayStreak } from "@/lib/habits/overallStreak";
import type { MonthStats } from "@/lib/habits/stats";
import { currentStreak, maxStreak } from "@/lib/habits/streaks";
import type { RingStats } from "@/lib/habits/ringStats";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export type HabitBadgeDef = {
  id: string;
  title: string;
  description: string;
  tier: BadgeTier;
  /** Tailwind gradient stops for card background */
  gradient: string;
};

export const HABIT_BADGE_DEFS: HabitBadgeDef[] = [
  {
    id: "first_check",
    title: "First Step",
    description: "Log your first habit check-in",
    tier: "bronze",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
  },
  {
    id: "all_today",
    title: "Full House",
    description: "Complete every habit today",
    tier: "gold",
    gradient: "from-violet-500 via-fuchsia-500 to-pink-500",
  },
  {
    id: "streak_7",
    title: "7-Day Flame",
    description: "7-day streak on any habit",
    tier: "bronze",
    gradient: "from-orange-500 via-red-500 to-rose-600",
  },
  {
    id: "streak_30",
    title: "Monthly Momentum",
    description: "30-day streak on any habit",
    tier: "silver",
    gradient: "from-sky-400 via-blue-500 to-indigo-600",
  },
  {
    id: "streak_100",
    title: "Century Club",
    description: "100-day best streak on any habit",
    tier: "platinum",
    gradient: "from-zinc-300 via-slate-200 to-zinc-400",
  },
  {
    id: "perfect_week",
    title: "Perfect Week",
    description: "100% completion in any week this month",
    tier: "gold",
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
  },
  {
    id: "perfect_day_7",
    title: "All-In Week",
    description: "7-day streak completing every habit",
    tier: "gold",
    gradient: "from-lime-400 via-green-500 to-emerald-600",
  },
  {
    id: "month_half",
    title: "Halfway Hero",
    description: "50% month completion",
    tier: "bronze",
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
  },
  {
    id: "month_gold",
    title: "Gold Month",
    description: "70% month completion",
    tier: "gold",
    gradient: "from-yellow-300 via-amber-400 to-orange-500",
  },
  {
    id: "month_platinum",
    title: "Platinum Month",
    description: "90% month completion",
    tier: "platinum",
    gradient: "from-slate-300 via-zinc-200 to-stone-300",
  },
];

const BADGE_BY_ID = new Map(HABIT_BADGE_DEFS.map((b) => [b.id, b]));

export function getBadgeDef(id: string): HabitBadgeDef | undefined {
  return BADGE_BY_ID.get(id);
}

export type BadgeEvalContext = {
  habitIds: string[];
  datesByHabit: Map<string, string[]>;
  stats: MonthStats;
  rings: RingStats;
  totalCompletions: number;
};

/** Returns badge IDs newly earned (not yet in `alreadyUnlocked`). */
export function evaluateNewBadges(
  ctx: BadgeEvalContext,
  alreadyUnlocked: Set<string>,
): string[] {
  const earned = computeEarnedBadgeIds(ctx);
  return [...earned].filter((id) => !alreadyUnlocked.has(id));
}

export function computeEarnedBadgeIds(ctx: BadgeEvalContext): Set<string> {
  const earned = new Set<string>();
  const { habitIds, datesByHabit, stats, rings, totalCompletions } = ctx;

  if (totalCompletions > 0) earned.add("first_check");

  if (habitIds.length > 0 && rings.todayPct >= 100) earned.add("all_today");

  let bestCurrent = 0;
  let bestMax = 0;
  for (const habitId of habitIds) {
    const dates = datesByHabit.get(habitId) ?? [];
    bestCurrent = Math.max(bestCurrent, currentStreak(dates));
    bestMax = Math.max(bestMax, maxStreak(dates));
  }

  if (bestCurrent >= 7) earned.add("streak_7");
  if (bestCurrent >= 30) earned.add("streak_30");
  if (bestMax >= 100) earned.add("streak_100");

  if (Object.values(stats.weeklyPct).some((pct) => pct >= 100)) earned.add("perfect_week");

  if (perfectDayStreak(habitIds, datesByHabit) >= 7) earned.add("perfect_day_7");

  if (stats.activeDaysPct >= 50) earned.add("month_half");
  if (stats.activeDaysPct >= 70) earned.add("month_gold");
  if (stats.activeDaysPct >= 90) earned.add("month_platinum");

  return earned;
}

export function countTotalCompletions(datesByHabit: Map<string, string[]>): number {
  let n = 0;
  for (const dates of datesByHabit.values()) n += dates.length;
  return n;
}
