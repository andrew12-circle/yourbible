import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentReadingStreak, localDateISO } from "@/lib/bible/readingStreak";
import { formatSupabaseError } from "@/lib/supabase/errors";

const ACTIVITY_QUERY_KEY = ["reading-activity"] as const;

async function fetchReadingActivityDates(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("reading_activity")
    .select("activity_date")
    .eq("user_id", userId)
    .order("activity_date", { ascending: false })
    .limit(400);

  if (error) throw new Error(formatSupabaseError(error));
  return (data ?? []).map((row) => row.activity_date as string);
}

export function useReadingStreak(userId: string | undefined) {
  const query = useQuery({
    queryKey: [...ACTIVITY_QUERY_KEY, userId],
    queryFn: () => fetchReadingActivityDates(userId!),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });

  const streak = useMemo(
    () => currentReadingStreak(query.data ?? []),
    [query.data],
  );

  return { streak, ...query };
}

export function useRecordReadingActivity(userId: string | undefined, book: string, chapter: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const today = localDateISO();

    void (async () => {
      const { data: existing } = await supabase
        .from("reading_activity")
        .select("activity_date")
        .eq("user_id", userId)
        .eq("activity_date", today)
        .maybeSingle();

      if (existing) return;

      const { error } = await supabase.from("reading_activity").insert({
        user_id: userId,
        activity_date: today,
        chapters_read: 1,
      });

      if (error) {
        console.warn("[reading_activity]", formatSupabaseError(error));
        return;
      }

      queryClient.invalidateQueries({ queryKey: [...ACTIVITY_QUERY_KEY, userId] });
    })();
  }, [userId, book, chapter, queryClient]);
}
