import { useQuery } from "@tanstack/react-query";
import { fetchBookIntroduction, type BookIntroduction } from "@/lib/bible/api";
import { fallbackBookIntroduction } from "@/data/bookIntroFallbacks";

export function useBookIntroduction(
  bibleId: string,
  bookAbbr: string,
  chapter: number,
  enabled = true,
) {
  return useQuery<BookIntroduction | null>({
    queryKey: ["book-intro", bibleId, bookAbbr],
    queryFn: async () => {
      const fromApi = await fetchBookIntroduction(bibleId, bookAbbr);
      if (fromApi?.html?.trim()) return fromApi;
      return fallbackBookIntroduction(bookAbbr);
    },
    staleTime: 1000 * 60 * 60 * 24,
    enabled: enabled && Boolean(bibleId && bookAbbr && chapter === 1),
  });
}
