import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { areSameStreamSplits, isStreamSplitsReady, streamPageCount, type ReaderStreamUnit } from "@/lib/bible/readerStream";
type KeyedStreamSplits = { paginationKey: string; splits: number[] };
const UNMEASURED_STREAM_SPLITS: number[] = [0];

/** Reuse exact-layout measurements, never another chapter's or provisional boundaries. */
export function useKeyedReaderStreamSplits(paginationKey: string) {
  const active = useRef(paginationKey);
  const cache = useRef(new Map<string, number[]>());
  useLayoutEffect(() => { active.current = paginationKey; }, [paginationKey]);
  const [snapshot, setSnapshot] = useState<KeyedStreamSplits>({ paginationKey, splits: UNMEASURED_STREAM_SPLITS });
  const streamSplits = snapshot.paginationKey === paginationKey ? snapshot.splits : cache.current.get(paginationKey) ?? UNMEASURED_STREAM_SPLITS;
  const onStreamSplitsChange = useCallback((next: number[]) => {
    if (active.current !== paginationKey) return;
    cache.current.set(paginationKey, next.slice());
    while (cache.current.size > 12) cache.current.delete(cache.current.keys().next().value!);
    setSnapshot((previous) => previous.paginationKey === paginationKey && areSameStreamSplits(previous.splits, next) ? previous : { paginationKey, splits: next.slice() });
  }, [paginationKey]);
  return { streamSplits, onStreamSplitsChange };
}
export interface UseReaderPaginationOptions { useBookSpread: boolean; useStreamReader: boolean; useSpreadDoubleColumn: boolean; streamSplits: number[]; readerStream: ReaderStreamUnit[] }
export function useReaderPagination({ streamSplits, readerStream }: UseReaderPaginationOptions) {
  const navStreamSplits = useMemo(() => streamSplits, [streamSplits]);
  const streamSplitsReady = isStreamSplitsReady(navStreamSplits, readerStream.length);
  return { navStreamSplits, streamSplitsReady, totalStreamPages: streamSplitsReady ? streamPageCount(navStreamSplits, readerStream.length) : 1 };
}
