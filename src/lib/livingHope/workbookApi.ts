import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { emptyWorkbook, mergeWorkbook, weekStartISO, type LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";

export type WorkbookRow = Tables<"living_hope_workbook">;
export type WeeklyReviewRow = Tables<"living_hope_weekly_reviews">;

export async function getOrCreateWorkbook(userId: string): Promise<LivingHopeWorkbookContent> {
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
}

export async function saveWorkbook(userId: string, content: LivingHopeWorkbookContent): Promise<void> {
  const { error } = await supabase.from("living_hope_workbook").upsert({
    user_id: userId,
    content: content as unknown as TablesInsert<"living_hope_workbook">["content"],
  });
  if (error) throw error;
}

export async function getWeeklyReview(userId: string, weekStart?: string): Promise<WeeklyReviewRow | null> {
  const ws = weekStart ?? weekStartISO();
  const { data, error } = await supabase
    .from("living_hope_weekly_reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", ws)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveWeeklyReview(
  userId: string,
  answers: string[],
  weekStart?: string,
): Promise<WeeklyReviewRow> {
  const ws = weekStart ?? weekStartISO();
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
}

export function parseWeeklyAnswers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a) => String(a));
}
