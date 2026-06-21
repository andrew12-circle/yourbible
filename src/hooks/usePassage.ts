import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Passage } from "@/lib/bible/api";
import { fetchPassageWithCache, hydratePassageFromCache } from "@/lib/bible/fetchPassageWithCache";
import { PASSAGE_PARSER_REVISION } from "@/lib/bible/textRevision";

export function passageQueryKey(bibleId: string, book: string, chapter: number) {
  return ["passage", PASSAGE_PARSER_REVISION, bibleId, book, chapter] as const;
}

export function usePassage(
  bibleId: string,
  book: string,
  chapter: number,
  enabled = true,
  bibleAbbr?: string,
) {
  useEffect(() => {
    if (!bibleId || !enabled) return;
    void hydratePassageFromCache(bibleId, book, chapter);
  }, [bibleId, book, chapter, enabled]);

  return useQuery<Passage>({
    queryKey: passageQueryKey(bibleId, book, chapter),
    queryFn: ({ signal }) => fetchPassageWithCache(bibleId, book, chapter, signal, bibleAbbr),
    enabled: Boolean(bibleId) && enabled,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60 * 24 * 30,
  });
}
