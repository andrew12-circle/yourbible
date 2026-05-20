import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { throwSupabaseError } from "@/lib/supabase/errors";

export type HabitBadgeRow = Tables<"habit_badges">;

export async function listUnlockedBadges(userId: string): Promise<HabitBadgeRow[]> {
  const { data, error } = await supabase
    .from("habit_badges")
    .select("*")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });
  if (error) throwSupabaseError(error);
  return data ?? [];
}

export async function unlockBadges(userId: string, badgeIds: string[]): Promise<number> {
  if (badgeIds.length === 0) return 0;

  const rows: TablesInsert<"habit_badges">[] = badgeIds.map((badge_id) => ({
    user_id: userId,
    badge_id,
  }));

  const { data, error } = await supabase
    .from("habit_badges")
    .upsert(rows, { onConflict: "user_id,badge_id", ignoreDuplicates: true })
    .select("id");

  if (error) throwSupabaseError(error);
  return data?.length ?? 0;
}
