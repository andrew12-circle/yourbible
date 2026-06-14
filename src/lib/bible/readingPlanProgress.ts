import { getReadingPlan, type ReadingPlan } from "@/data/readingPlans";

export type PlanProgressRow = { plan_id: string; day_index: number };

export interface NextReadingPlanDay {
  plan: ReadingPlan;
  dayIndex: number;
  dayTitle: string;
  readings: { book: string; chapter: number }[];
  referenceLabel: string;
}

export function formatReadingPlanReference(readings: { book: string; chapter: number }[]): string {
  if (!readings.length) return "";
  if (readings.length === 1) {
    const r = readings[0];
    return `${r.book} ${r.chapter}`;
  }
  return readings.map((r) => `${r.book} ${r.chapter}`).join(" · ");
}

/** First incomplete day on the in-progress plan the user has advanced furthest on. */
export function findNextReadingPlanDay(progress: PlanProgressRow[]): NextReadingPlanDay | null {
  const completedByPlan = new Map<string, Set<number>>();
  for (const row of progress) {
    if (!completedByPlan.has(row.plan_id)) completedByPlan.set(row.plan_id, new Set());
    completedByPlan.get(row.plan_id)!.add(row.day_index);
  }

  const candidates: { plan: ReadingPlan; done: Set<number> }[] = [];
  for (const [planId, done] of completedByPlan) {
    const plan = getReadingPlan(planId);
    if (!plan || done.size === 0 || done.size >= plan.days) continue;
    candidates.push({ plan, done });
  }
  candidates.sort((a, b) => b.done.size - a.done.size);

  for (const { plan, done } of candidates) {
    for (const day of plan.schedule) {
      if (done.has(day.day)) continue;
      return {
        plan,
        dayIndex: day.day,
        dayTitle: day.title,
        readings: day.readings,
        referenceLabel: formatReadingPlanReference(day.readings),
      };
    }
  }

  return null;
}

export function primaryReadingForPlanDay(day: NextReadingPlanDay): { book: string; chapter: number } | null {
  return day.readings[0] ?? null;
}
