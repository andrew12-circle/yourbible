import { useQuery } from "@tanstack/react-query";
import type { Passage } from "@/lib/bible/api";
import { fetchPassageWithCache } from "@/lib/bible/fetchPassageWithCache";
import { PASSAGE_PARSER_REVISION } from "@/lib/bible/textRevision";
import { bibleDeliveryMode } from "@/lib/bible/bibleEditions";
import { identifyReaderPassage } from "@/lib/bible/readerPassageIdentity";

export function passageQueryKey(bibleId: string, book: string, chapter: number) {
  return ["passage", PASSAGE_PARSER_REVISION, "reader-integrity-v1", bibleDeliveryMode(bibleId), bibleId, book, chapter] as const;
}

export function usePassage(bibleId: string, book: string, chapter: number, enabled = true, bibleAbbr?: string) {
  return useQuery<Passage>({
    queryKey: passageQueryKey(bibleId, book, chapter),
    queryFn: ({ signal }) => fetchPassageWithCache(bibleId, book, chapter, signal, bibleAbbr),
    enabled: Boolean(bibleId && book && chapter > 0) && enabled,
    // Previous-query data must never inherit the next chapter's title or actions.
    // The loader owns cache hydration too; a second effect cannot overwrite it.
    select: (data) => identifyReaderPassage(data, bibleId, book, chapter),
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60 * 24 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
