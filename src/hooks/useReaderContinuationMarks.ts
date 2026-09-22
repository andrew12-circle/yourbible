import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { ChapterRef } from "@/lib/bible/chapterNav";
import type { Highlight, Note } from "./useUserData";

/** Read-only marks for chapters beyond the original previous/current/next set. */
export function useReaderContinuationMarks(refs: ChapterRef[], enabled: boolean) {
  const { user } = useAuth();
  const userId = user?.id;
  const queries = useMemo(() => refs.map(ref => ({
    queryKey: ["reader-continuation-marks", userId, ref.book.abbr, ref.chapter],
    enabled: enabled && !!userId,
    staleTime: 30_000,
    gcTime: 60_000,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      if (!userId) return { highlights: [] as Highlight[], notes: [] as Note[] };
      const [highlights, notes] = await Promise.all([
        supabase.from("highlights").select("*").eq("user_id", userId).eq("book", ref.book.abbr).eq("chapter", ref.chapter).abortSignal(signal),
        supabase.from("notes").select("*").eq("user_id", userId).eq("book", ref.book.abbr).eq("chapter", ref.chapter).abortSignal(signal),
      ]);
      if (highlights.error) throw highlights.error;
      if (notes.error) throw notes.error;
      return {
        highlights: ((highlights.data ?? []) as Highlight[]).map(mark => ({ ...mark, kind: mark.kind ?? "highlight", start_offset: mark.start_offset ?? null, end_offset: mark.end_offset ?? null })),
        notes: (notes.data ?? []) as Note[],
      };
    },
  })), [refs, enabled, userId]);
  const results = useQueries({ queries });
  return new Map(refs.flatMap((ref, index) => enabled && userId && results[index].data
    ? [[`${ref.book.abbr}|${ref.chapter}`, results[index].data!] as const] : []));
}
