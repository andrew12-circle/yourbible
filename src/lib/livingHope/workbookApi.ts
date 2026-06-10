import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  localGetWeeklyReview,
  localGetWorkbook,
  localSaveWeeklyReview,
  localSaveWorkbook,
  notifyLocalModeOnce,
} from "@/lib/livingHope/livingHopeLocalStore";
import { emptyWorkbook, mergeWorkbook, weekStartISO, type LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";
import { isSupabaseMissingTable } from "@/lib/supabase/errors";

export type WorkbookRow = Tables<"living_hope_workbook">;
export type WeeklyReviewRow = Tables<"living_hope_weekly_reviews">;

export async function getOrCreateWorkbook(userId: string): Promise<LivingHopeWorkbookContent> {
  try {
    const { data, error } = await supabase
      .from("living_hope_workbook")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return mergeWorkbook(data.content);

    const insert: TablesInsert<"living_hope_workbook"> = {
      user_id: userId,
      content: emptyWorkbook() as unknown as TablesInsert<"living_hope_workbook">["content"],
    };
    const { data: created, error: insErr } = await supabase
      .from("living_hope_workbook")
      .insert(insert)
      .select()
      .single();
    if (insErr) throw insErr;
    return mergeWorkbook(created.content);
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    notifyLocalModeOnce();
    return localGetWorkbook(userId);
  }
}

export async function saveWorkbook(userId: string, content: LivingHopeWorkbookContent): Promise<void> {
  try {
    const { error } = await supabase.from("living_hope_workbook").upsert({
      user_id: userId,
      content: content as unknown as TablesInsert<"living_hope_workbook">["content"],
    });
    if (error) throw error;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    localSaveWorkbook(userId, content);
  }
}

export async function getWeeklyReview(userId: string, weekStart?: string): Promise<WeeklyReviewRow | null> {
  const ws = weekStart ?? weekStartISO();
  try {
    const { data, error } = await supabase
      .from("living_hope_weekly_reviews")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", ws)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    const local = localGetWeeklyReview(userId, ws);
    if (!local) return null;
    return {
      id: `local-${ws}`,
      user_id: userId,
      week_start: local.week_start,
      answers: local.answers,
      completed_at: local.completed_at,
      created_at: local.completed_at,
    };
  }
}

export async function saveWeeklyReview(
  userId: string,
  answers: string[],
  weekStart?: string,
): Promise<WeeklyReviewRow> {
  const ws = weekStart ?? weekStartISO();
  try {
    const row: TablesInsert<"living_hope_weekly_reviews"> = {
      user_id: userId,
      week_start: ws,
      answers,
      completed_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("living_hope_weekly_reviews")
      .upsert(row, { onConflict: "user_id,week_start" })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    const local = localSaveWeeklyReview(userId, ws, answers);
    return {
      id: `local-${ws}`,
      user_id: userId,
      week_start: local.week_start,
      answers: local.answers,
      completed_at: local.completed_at,
      created_at: local.completed_at,
    };
  }
}

export function parseWeeklyAnswers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a) => String(a));
}
