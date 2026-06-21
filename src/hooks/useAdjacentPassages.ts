import { useMemo } from "react";
import type { Passage } from "@/lib/bible/api";
import { getNextChapterRef, getPrevChapterRef } from "@/lib/bible/chapterNav";
import { usePassage } from "@/hooks/usePassage";

export interface AdjacentPassages {
  prev: Passage | undefined;
  current: Passage | undefined;
  next: Passage | undefined;
  prevRef: ReturnType<typeof getPrevChapterRef>;
  nextRef: ReturnType<typeof getNextChapterRef>;
  loading: boolean;
  streamReady: boolean;
}

export function useAdjacentPassages(
  bibleId: string,
  bookAbbr: string,
  bookName: string,
  chapter: number,
  enabled: boolean,
  bibleEditionAbbr?: string,
): AdjacentPassages {
  const prevRef = useMemo(() => getPrevChapterRef(bookAbbr, chapter), [bookAbbr, chapter]);
  const nextRef = useMemo(() => getNextChapterRef(bookAbbr, chapter), [bookAbbr, chapter]);

  const currentQuery = usePassage(bibleId, bookAbbr, chapter, true, bibleEditionAbbr);
  const prevQuery = usePassage(
    bibleId,
    prevRef?.book.abbr ?? bookAbbr,
    prevRef?.chapter ?? 1,
    enabled && prevRef != null,
    bibleEditionAbbr,
  );
  const nextQuery = usePassage(
    bibleId,
    nextRef?.book.abbr ?? bookAbbr,
    nextRef?.chapter ?? 1,
    enabled && nextRef != null,
    bibleEditionAbbr,
  );

  const prev = prevRef ? prevQuery.data : undefined;
  const next = nextRef ? nextQuery.data : undefined;
  const current = currentQuery.data;

  const loading =
    enabled &&
    (currentQuery.isLoading ||
      (prevRef != null && prevQuery.isLoading) ||
      (nextRef != null && nextQuery.isLoading));

  const streamReady =
    !enabled ||
    (!!current &&
      (!prevRef || !!prev) &&
      (!nextRef || !!next));

  return {
    prev,
    current,
    next,
    prevRef,
    nextRef,
    loading,
    streamReady,
  };
}
