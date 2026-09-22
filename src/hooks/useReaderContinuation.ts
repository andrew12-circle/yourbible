import { useCallback, useMemo, useState } from "react";
import { useQueries, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { Passage } from "@/lib/bible/api";
import { getNextChapterRef } from "@/lib/bible/chapterNav";
import { fetchPassageWithCache } from "@/lib/bible/fetchPassageWithCache";
import { identifyReaderPassage } from "@/lib/bible/readerPassageIdentity";
import { passageToStreamChapter } from "@/lib/bible/readerStreamChapters";
import type { ReaderChapterPassage } from "@/lib/bible/readerStream";
import { passageQueryKey } from "./usePassage";
import {
  continuationChapterRefs, continuationCountThrough, MAX_READER_CONTINUATION_CHAPTERS,
  type ReaderChapterIdentity,
} from "@/lib/bible/readerContinuation";

const combine = (results: UseQueryResult<Passage>[]) => ({
  passages: results.map(result => result.data),
  pending: results.some(result => result.isPending && !result.isError),
  error: results.find(result => result.isError)?.error ?? null,
  errorIndex: results.findIndex(result => result.isError),
});
interface Options {
  bibleId: string; bibleAbbr?: string; scope: string; after: ReaderChapterIdentity;
  baseChapters: ReaderChapterPassage[]; baseReady: boolean; enabled: boolean;
  through?: ReaderChapterIdentity; closed?: boolean;
}

/** Append verified, contiguous chapters only when measured pages need them. Never bulk-load a book. */
export function useReaderContinuation({ bibleId, bibleAbbr, scope, after, baseChapters, baseReady, enabled, through, closed }: Options) {
  const client = useQueryClient();
  const minimum = continuationCountThrough(after, through);
  const [snapshot, setSnapshot] = useState({ scope, count: minimum });
  const count = Math.max(minimum, snapshot.scope === scope ? snapshot.count : minimum);
  const refs = useMemo(() => continuationChapterRefs({ bookAbbr: after.bookAbbr, chapter: after.chapter }, count), [after.bookAbbr, after.chapter, count]);
  const queries = useMemo(() => refs.map(ref => ({
    queryKey: passageQueryKey(bibleId, ref.book.abbr, ref.chapter),
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchPassageWithCache(bibleId, ref.book.abbr, ref.chapter, signal, bibleAbbr),
    select: (data: Passage) => identifyReaderPassage(data, bibleId, ref.book.abbr, ref.chapter),
    enabled: enabled && baseReady && Boolean(bibleId),
    staleTime: 7 * 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })), [refs, bibleId, bibleAbbr, enabled, baseReady]);
  const result = useQueries({ queries, combine });
  const chapters = useMemo(() => {
    if (!enabled || !baseReady) return baseChapters;
    const extended = [...baseChapters];
    for (let i = 0; i < refs.length; i++) {
      // A later cached chapter must not jump over a missing earlier chapter.
      if (!result.passages[i]) break;
      const ref = refs[i];
      const chapter = passageToStreamChapter(ref.book.abbr, ref.book.name, ref.chapter, result.passages[i]);
      if (!chapter) break;
      extended.push(chapter);
    }
    return extended.length === baseChapters.length ? baseChapters : extended;
  }, [enabled, baseReady, baseChapters, refs, result.passages]);
  const edge = refs.at(-1);
  const hasNext = !!getNextChapterRef(edge?.book.abbr ?? after.bookAbbr, edge?.chapter ?? after.chapter);
  const pending = enabled && baseReady && result.pending;
  const canExtend = enabled && baseReady && !closed && !pending && !result.error && hasNext && count < MAX_READER_CONTINUATION_CHAPTERS;
  const extend = useCallback(() => {
    if (!canExtend) return;
    setSnapshot(old => {
      const activeCount = Math.max(minimum, old.scope === scope ? old.count : minimum);
      // Repeated effects must not schedule several speculative chapters at once.
      return activeCount !== count ? old : { scope, count: count + 1 };
    });
  }, [canExtend, minimum, scope, count]);
  const retry = useCallback(() => {
    const ref = refs[result.errorIndex];
    if (ref) void client.refetchQueries({ queryKey: passageQueryKey(bibleId, ref.book.abbr, ref.chapter), exact: true });
  }, [client, refs, bibleId, result.errorIndex]);
  return { chapters, pending, canExtend, extend, retry, error: enabled ? result.error : null, refs };
}
