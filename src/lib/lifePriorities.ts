import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type LifePriorityRow = Tables<"life_priorities">;
export type LifePriorityLogRow = Tables<"life_priority_logs">;

export type PriorityKey = "god" | "health" | "family" | "work" | "others";

/** Local calendar date YYYY-MM-DD */
export function localDateISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysISO(isoDate: string, deltaDays: number): string {
  const [y, mo, da] = isoDate.split("-").map(Number);
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + deltaDays);
  return localDateISO(dt);
}

/** Last `count` calendar days ending at `endISO` (inclusive), oldest first. */
export function lastNDates(endISO: string, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(addDaysISO(endISO, -i));
  }
  return out;
}

export async function ensureDefaults(): Promise<void> {
  const { error } = await supabase.rpc("ensure_default_life_priorities");
  if (error) throw error;
}

export async function listPriorities(userId: string): Promise<LifePriorityRow[]> {
  const { data, error } = await supabase
    .from("life_priorities")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("rank", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listArchivedPriorities(userId: string): Promise<LifePriorityRow[]> {
  const { data, error } = await supabase
    .from("life_priorities")
    .select("*")
    .eq("user_id", userId)
    .not("archived_at", "is", null)
    .order("rank", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function restorePriority(userId: string, id: string): Promise<void> {
  await updatePriority(userId, id, { archived_at: null });
  const active = await listPriorities(userId);
  await reorder(userId, active.map((r) => r.id));
}

export async function listLogsForRange(
  userId: string,
  startISO: string,
  endISO: string,
): Promise<LifePriorityLogRow[]> {
  const { data, error } = await supabase
    .from("life_priority_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", startISO)
    .lte("log_date", endISO);
  if (error) throw error;
  return data ?? [];
}

export async function listTodayLogs(userId: string, todayISO = localDateISO()): Promise<LifePriorityLogRow[]> {
  const { data, error } = await supabase
    .from("life_priority_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", todayISO);
  if (error) throw error;
  return data ?? [];
}

export async function logToday(
  userId: string,
  priorityId: string,
  opts?: { minutes?: number; note?: string | null },
  todayISO = localDateISO(),
): Promise<void> {
  const minutes = opts?.minutes ?? 0;
  const row: TablesInsert<"life_priority_logs"> = {
    user_id: userId,
    priority_id: priorityId,
    log_date: todayISO,
    minutes,
    note: opts?.note ?? null,
  };
  const { error } = await supabase.from("life_priority_logs").upsert(row, {
    onConflict: "user_id,priority_id,log_date",
  });
  if (error) throw error;
}

export async function addMinutesToday(
  userId: string,
  priorityId: string,
  add: number,
  todayISO = localDateISO(),
): Promise<void> {
  const { data: existing, error: selErr } = await supabase
    .from("life_priority_logs")
    .select("id, minutes")
    .eq("user_id", userId)
    .eq("priority_id", priorityId)
    .eq("log_date", todayISO)
    .maybeSingle();
  if (selErr) throw selErr;
  const next = (existing?.minutes ?? 0) + add;
  await logToday(userId, priorityId, { minutes: next }, todayISO);
}

export async function unlogToday(userId: string, priorityId: string, todayISO = localDateISO()): Promise<void> {
  const { error } = await supabase
    .from("life_priority_logs")
    .delete()
    .eq("user_id", userId)
    .eq("priority_id", priorityId)
    .eq("log_date", todayISO);
  if (error) throw error;
}

export async function updatePriority(
  userId: string,
  id: string,
  patch: TablesUpdate<"life_priorities">,
): Promise<void> {
  const { error } = await supabase.from("life_priorities").update(patch).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

/** Persist order as ranks 1..n for the given active priority IDs (top to bottom). */
export async function reorder(userId: string, orderedIds: string[]): Promise<void> {
  if (!orderedIds.length) return;
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const { error } = await supabase
      .from("life_priorities")
      .update({ rank: 10 + i })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const { error } = await supabase
      .from("life_priorities")
      .update({ rank: i + 1 })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  }
}

export async function archivePriority(userId: string, id: string): Promise<void> {
  await updatePriority(userId, id, { archived_at: new Date().toISOString() });
  await normalizeRanks(userId);
}

async function normalizeRanks(userId: string): Promise<void> {
  const rows = await listPriorities(userId);
  await reorder(
    userId,
    rows.map((r) => r.id),
  );
}
