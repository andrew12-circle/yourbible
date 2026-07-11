import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { DEFAULT_HABIT_NAMES } from "@/lib/habits/defaults";
import { countsForCredit } from "@/lib/habits/credit";
import { yearMonthFromDate } from "@/lib/habits/dates";
import { throwSupabaseError } from "@/lib/supabase/errors";

export type HabitRow = Tables<"habits">;
export type HabitCompletionRow = Tables<"habit_completions">;
export type HabitNoteRow = Tables<"habit_notes">;

export async function syncHabitFrameworkTemplate(): Promise<void> {
  const { error } = await supabase.rpc("sync_habit_framework_template");
  if (error) throwSupabaseError(error);
}

export async function listHabits(userId: string): Promise<HabitRow[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });
  if (error) throwSupabaseError(error);
  return data ?? [];
}

export async function listCompletionsForMonth(
  userId: string,
  yearMonth: string,
): Promise<HabitCompletionRow[]> {
  const start = `${yearMonth}-01`;
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("habit_completions")
    .select("*")
    .eq("user_id", userId)
    .gte("completion_date", start)
    .lte("completion_date", end);
  if (error) throwSupabaseError(error);
  return data ?? [];
}

export async function listAllCompletionDates(
  userId: string,
  habitIds: string[],
): Promise<Map<string, string[]>> {
  if (habitIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("habit_completions")
    .select("habit_id, completion_date, created_at")
    .eq("user_id", userId)
    .in("habit_id", habitIds)
    .order("completion_date", { ascending: true });
  if (error) throwSupabaseError(error);

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    if (!countsForCredit(row.completion_date, row.created_at)) continue;
    const list = map.get(row.habit_id) ?? [];
    list.push(row.completion_date);
    map.set(row.habit_id, list);
  }
  return map;
}

export async function createHabit(
  userId: string,
  input: { name: string; category?: string | null; sort_order?: number },
): Promise<HabitRow> {
  const row: TablesInsert<"habits"> = {
    user_id: userId,
    name: input.name.trim(),
    category: input.category?.trim() || null,
    sort_order: input.sort_order ?? 0,
  };
  const { data, error } = await supabase.from("habits").insert(row).select().single();
  if (error) throwSupabaseError(error);
  return data;
}

export async function updateHabit(
  userId: string,
  id: string,
  patch: TablesUpdate<"habits">,
): Promise<void> {
  const { error } = await supabase.from("habits").update(patch).eq("user_id", userId).eq("id", id);
  if (error) throwSupabaseError(error);
}

export async function archiveHabit(userId: string, id: string): Promise<void> {
  await updateHabit(userId, id, { archived_at: new Date().toISOString() });
}

export async function reorderHabits(userId: string, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) => updateHabit(userId, id, { sort_order: index })),
  );
}

export async function toggleCompletion(
  userId: string,
  habitId: string,
  completionDate: string,
  completed: boolean,
): Promise<void> {
  if (completed) {
    const row: TablesInsert<"habit_completions"> = {
      user_id: userId,
      habit_id: habitId,
      completion_date: completionDate,
    };
    const { error } = await supabase.from("habit_completions").upsert(row, {
      onConflict: "user_id,habit_id,completion_date",
    });
    if (error) throwSupabaseError(error);
  } else {
    const { error } = await supabase
      .from("habit_completions")
      .delete()
      .eq("user_id", userId)
      .eq("habit_id", habitId)
      .eq("completion_date", completionDate);
    if (error) throwSupabaseError(error);
  }
}

export async function importDefaultHabits(userId: string): Promise<number> {
  const existing = await listHabits(userId);
  const existingNames = new Set(existing.map((h) => h.name.trim().toLowerCase()));

  const missing = DEFAULT_HABIT_NAMES.filter(
    (h) => !existingNames.has(h.name.trim().toLowerCase()),
  );
  if (missing.length === 0) return 0;

  const startOrder = existing.length;
  const rows: TablesInsert<"habits">[] = missing.map((h, i) => ({
    user_id: userId,
    name: h.name,
    category: h.category ?? null,
    sort_order: startOrder + i,
  }));
  const { error } = await supabase.from("habits").insert(rows);
  if (error) throwSupabaseError(error);
  return rows.length;
}

/** Archives every active habit and replaces with the current season template. */
export async function replaceHabitsWithDefaults(userId: string): Promise<number> {
  const existing = await listHabits(userId);
  await Promise.all(existing.map((h) => archiveHabit(userId, h.id)));

  const rows: TablesInsert<"habits">[] = DEFAULT_HABIT_NAMES.map((h, i) => ({
    user_id: userId,
    name: h.name,
    category: h.category ?? null,
    sort_order: i,
  }));
  const { error } = await supabase.from("habits").insert(rows);
  if (error) throwSupabaseError(error);
  return rows.length;
}

export async function getHabitNote(
  userId: string,
  habitId: string | null,
  yearMonth: string,
): Promise<string> {
  let q = supabase
    .from("habit_notes")
    .select("body")
    .eq("user_id", userId)
    .eq("year_month", yearMonth);

  if (habitId === null) {
    q = q.is("habit_id", null);
  } else {
    q = q.eq("habit_id", habitId);
  }

  const { data, error } = await q.maybeSingle();
  if (error) throwSupabaseError(error);
  return data?.body ?? "";
}

export async function saveHabitNote(
  userId: string,
  habitId: string | null,
  yearMonth: string,
  body: string,
): Promise<void> {
  const row: TablesInsert<"habit_notes"> = {
    user_id: userId,
    habit_id: habitId,
    year_month: yearMonth,
    body,
  };
  const { error } = await supabase.from("habit_notes").upsert(row, {
    onConflict: "user_id,habit_id,year_month",
  });
  if (error) throwSupabaseError(error);
}

export function currentYearMonth(): string {
  return yearMonthFromDate();
}
