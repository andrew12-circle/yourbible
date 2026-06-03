import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Passage } from "@/lib/bible/api";
import { fetchPassageWithCache, hydratePassageFromCache } from "@/lib/bible/fetchPassageWithCache";

export function passageQueryKey(bibleId: string, book: string, chapter: number) {
  return ["passage", bibleId, book, chapter] as const;
}

export function usePassage(bibleId: string, book: string, chapter: number) {
  useEffect(() => {
    if (!bibleId) return;
    void hydratePassageFromCache(bibleId, book, chapter);
  }, [bibleId, book, chapter]);

  return useQuery<Passage>({
    queryKey: passageQueryKey(bibleId, book, chapter),
    queryFn: ({ signal }) => fetchPassageWithCache(bibleId, book, chapter, signal),
    enabled: Boolean(bibleId),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60 * 24 * 30,
  });
}
