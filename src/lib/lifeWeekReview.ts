import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  computeLifeWeekIndex,
  formatLifeWeekRange,
  lifeWeekMondayIso,
} from "@/lib/lifeWeeks";

export type LifeWeekReviewRow = Tables<"life_week_reviews">;

export const LIFE_WEEK_REFLECTION_MIN = 20;

export const LIFE_WEEK_REFLECTION_PROMPT =
  "What did you do this past week to live the life you want—or the life God has called you to live?";

export function priorLifeWeekIndex(currentWeekIndex: number): number {
  return currentWeekIndex - 1;
}

/** Life week that must be closed before the current week (immediate prior Monday week). */
export function pendingLifeWeekIndex(
  currentWeekIndex: number,
  closedWeekIndices: ReadonlySet<number>,
): number | null {
  const prior = priorLifeWeekIndex(currentWeekIndex);
  if (prior < 0 || closedWeekIndices.has(prior)) return null;
  return prior;
}

export function needsPriorLifeWeekReview(
  currentWeekIndex: number,
  closedWeekIndices: ReadonlySet<number>,
): boolean {
  return pendingLifeWeekIndex(currentWeekIndex, closedWeekIndices) !== null;
}

export type PendingLifeWeekReview = {
  weekIndex: number;
  weekNumber: number;
  weekRangeLabel: string;
  weekStart: string;
};

export function buildPendingLifeWeekReview(
  birthIso: string,
  weekIndex: number,
): PendingLifeWeekReview | null {
  if (weekIndex < 0) return null;
  const weekStart = lifeWeekMondayIso(birthIso, weekIndex);
  if (!weekStart) return null;
  return {
    weekIndex,
    weekNumber: weekIndex + 1,
    weekRangeLabel: formatLifeWeekRange(birthIso, weekIndex),
    weekStart,
  };
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && error.code != null ? String(error.code) : "";
  const msg = "message" in error && error.message != null ? String(error.message) : "";
  return code === "42P01" || /life_week_reviews/i.test(msg);
}

export async function listClosedLifeWeekIndices(userId: string): Promise<Set<number>> {
  try {
    const { data, error } = await supabase
      .from("life_week_reviews")
      .select("week_index")
      .eq("user_id", userId);
    if (error) throw error;
    return new Set((data ?? []).map((row) => row.week_index));
  } catch (e) {
    if (isMissingTableError(e)) return new Set();
    throw e;
  }
}

export async function saveLifeWeekReview(
  userId: string,
  weekIndex: number,
  weekStart: string,
  reflection: string,
): Promise<LifeWeekReviewRow> {
  const trimmed = reflection.trim();
  if (trimmed.length < LIFE_WEEK_REFLECTION_MIN) {
    throw new Error(`Write at least ${LIFE_WEEK_REFLECTION_MIN} characters.`);
  }

  const row: TablesInsert<"life_week_reviews"> = {
    user_id: userId,
    week_index: weekIndex,
    week_start: weekStart,
    reflection: trimmed,
  };

  const { data, error } = await supabase
    .from("life_week_reviews")
    .upsert(row, { onConflict: "user_id,week_index" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export function resolvePendingLifeWeekReview(
  birthIso: string | null | undefined,
  nowMs: number = Date.now(),
  closedWeekIndices: ReadonlySet<number>,
): PendingLifeWeekReview | null {
  if (!birthIso?.trim()) return null;
  const indexState = computeLifeWeekIndex(birthIso, nowMs);
  if (!indexState) return null;
  const pendingIndex = pendingLifeWeekIndex(indexState.currentWeekIndex, closedWeekIndices);
  if (pendingIndex === null) return null;
  return buildPendingLifeWeekReview(birthIso, pendingIndex);
}
