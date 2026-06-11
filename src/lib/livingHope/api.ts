import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { computeUnlockAt, defaultLetterTitle } from "@/lib/livingHope/letterSections";
import {
  localCountReviewStreak,
  localCreateGoal,
  localDeleteGoal,
  localGetLetter,
  localGetTodayReview,
  localListGoals,
  localSaveMorningReview,
  localDeleteGoalById,
  localUpdateGoalById,
  localUpdateLetterById,
  notifyLocalModeOnce,
} from "@/lib/livingHope/livingHopeLocalStore";
import { localDateISO } from "@/lib/lifePriorities";
import type { MorningConnectionNotes } from "@/lib/livingHope/morningRitual";
import { isSupabaseMissingTable } from "@/lib/supabase/errors";

export type LivingHopeLetterRow = Tables<"living_hope_letters">;
export type LivingHopeGoalRow = Tables<"living_hope_goals">;
export type LivingHopeReviewRow = Tables<"living_hope_reviews">;

export type LetterStatus = "draft" | "sealed" | "opened";
export type GoalStatus = "active" | "achieved" | "released";

export interface GoalTouch {
  goal_id: string;
  vivid_recall: string;
  obedience_step: string;
}

export async function getOrCreateLetter(userId: string): Promise<LivingHopeLetterRow> {
  try {
    const { data: existing, error: selErr } = await supabase
      .from("living_hope_letters")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existing) return existing;

    const insert: TablesInsert<"living_hope_letters"> = {
      user_id: userId,
      title: defaultLetterTitle(2),
      timeframe_years: 2,
      status: "draft",
    };
    const { data, error } = await supabase.from("living_hope_letters").insert(insert).select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    notifyLocalModeOnce();
    return localGetLetter(userId);
  }
}

export async function updateLetter(
  id: string,
  patch: TablesUpdate<"living_hope_letters">,
): Promise<LivingHopeLetterRow> {
  try {
    const { data, error } = await supabase
      .from("living_hope_letters")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    return localUpdateLetterById(id, patch);
  }
}

export async function sealLetter(letter: LivingHopeLetterRow): Promise<LivingHopeLetterRow> {
  const now = new Date();
  const unlock = computeUnlockAt(now, letter.timeframe_years);
  return updateLetter(letter.id, {
    status: "sealed",
    sealed_at: now.toISOString(),
    unlock_at: unlock.toISOString(),
  });
}

export async function openLetter(id: string): Promise<LivingHopeLetterRow> {
  return updateLetter(id, {
    status: "opened",
    opened_at: new Date().toISOString(),
  });
}

export async function listGoals(userId: string, letterId?: string | null): Promise<LivingHopeGoalRow[]> {
  try {
    let q = supabase
      .from("living_hope_goals")
      .select("*")
      .eq("user_id", userId)
      .is("parent_goal_id", null)
      .order("sort_order", { ascending: true });
    if (letterId) q = q.eq("letter_id", letterId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    return localListGoals(userId, letterId);
  }
}

export async function createGoal(
  userId: string,
  input: {
    letter_id?: string | null;
    title: string;
    domain?: LivingHopeGoalRow["domain"];
    vivid_detail?: string;
    target_metric?: string;
    steps?: string[];
    scripture_refs?: string[];
    sort_order?: number;
  },
): Promise<LivingHopeGoalRow> {
  try {
    const insert: TablesInsert<"living_hope_goals"> = {
      user_id: userId,
      letter_id: input.letter_id ?? null,
      title: input.title,
      domain: input.domain ?? "others",
      vivid_detail: input.vivid_detail ?? null,
      target_metric: input.target_metric ?? null,
      steps: input.steps ?? [],
      scripture_refs: input.scripture_refs ?? [],
      sort_order: input.sort_order ?? 0,
    };
    const { data, error } = await supabase.from("living_hope_goals").insert(insert).select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    return localCreateGoal(userId, input);
  }
}

export async function updateGoal(
  id: string,
  patch: TablesUpdate<"living_hope_goals">,
): Promise<LivingHopeGoalRow> {
  try {
    const { data, error } = await supabase
      .from("living_hope_goals")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    return localUpdateGoalById(id, patch);
  }
}

export async function deleteGoal(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("living_hope_goals").delete().eq("id", id);
    if (error) throw error;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    localDeleteGoalById(id);
  }
}

export async function getTodayReview(userId: string): Promise<LivingHopeReviewRow | null> {
  const today = localDateISO();
  try {
    const { data, error } = await supabase
      .from("living_hope_reviews")
      .select("*")
      .eq("user_id", userId)
      .eq("review_date", today)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    return localGetTodayReview(userId);
  }
}

export interface MorningReviewPayload {
  surrender_note: string;
  goal_touches: GoalTouch[];
  vision_recall?: string;
  story_index?: number;
  manifesto_index?: number;
  routine_checks?: Record<string, boolean>;
  metric_values?: Record<string, number | string>;
  connection_notes?: MorningConnectionNotes;
}

export async function saveMorningReview(
  userId: string,
  input: MorningReviewPayload,
): Promise<LivingHopeReviewRow> {
  const today = localDateISO();
  try {
    const row: TablesInsert<"living_hope_reviews"> = {
      user_id: userId,
      review_date: today,
      surrender_note: input.surrender_note,
      goal_touches: input.goal_touches,
      vision_recall: input.vision_recall ?? null,
      story_index: input.story_index ?? null,
      manifesto_index: input.manifesto_index ?? null,
      routine_checks: input.routine_checks ?? {},
      metric_values: input.metric_values ?? {},
      connection_notes: (input.connection_notes ?? {}) as TablesInsert<"living_hope_reviews">["connection_notes"],
      completed_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("living_hope_reviews")
      .upsert(row, { onConflict: "user_id,review_date" })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    return localSaveMorningReview(userId, input);
  }
}

export async function countReviewStreak(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("living_hope_reviews")
      .select("review_date")
      .eq("user_id", userId)
      .order("review_date", { ascending: false })
      .limit(120);
    if (error) throw error;
    const dates = (data ?? []).map((r) => r.review_date);
    return streakFromDates(dates);
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    return localCountReviewStreak(userId);
  }
}

function streakFromDates(dates: string[]): number {
  if (!dates.length) return 0;
  let streak = 0;
  let cursor = localDateISO();
  const todayDone = dates[0] === cursor;
  if (!todayDone) {
    const yesterday = addDaysISO(cursor, -1);
    if (dates[0] !== yesterday) return 0;
    cursor = yesterday;
  }
  for (const d of dates) {
    if (d === cursor) {
      streak++;
      cursor = addDaysISO(cursor, -1);
    } else if (d < cursor) break;
  }
  return streak;
}

function addDaysISO(iso: string, delta: number): string {
  const [y, m, day] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, day);
  dt.setDate(dt.getDate() + delta);
  return localDateISO(dt);
}

export function parseGoalTouches(raw: unknown): GoalTouch[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({
      goal_id: String(x.goal_id ?? ""),
      vivid_recall: String(x.vivid_recall ?? ""),
      obedience_step: String(x.obedience_step ?? ""),
    }))
    .filter((x) => x.goal_id.length > 0);
}

export function parseSteps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => String(s)).filter((s) => s.trim().length > 0);
}
