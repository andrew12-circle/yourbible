import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  areSameStreamSplits,
  ensureSpreadPageSplits,
  isSpreadDoubleColumnSplitsReady,
  isStreamSplitsReady,
  streamPageCount,
  type ReaderStreamUnit,
} from "@/lib/bible/readerStream";

type KeyedStreamSplits = {
  paginationKey: string;
  splits: number[];
};

const UNMEASURED_STREAM_SPLITS: number[] = [0];

/**
 * Keep measured stream splits attached to the exact layout that produced them.
 * A new layout sees an unmeasured `[0]` snapshot until its paginator publishes,
 * without a parent effect racing the paginator and erasing fresh measurements.
 */
export function useKeyedReaderStreamSplits(paginationKey: string) {
  const activePaginationKeyRef = useRef(paginationKey);
  useLayoutEffect(() => {
    activePaginationKeyRef.current = paginationKey;
  }, [paginationKey]);
  const [snapshot, setSnapshot] = useState<KeyedStreamSplits>(() => ({
    paginationKey,
    splits: UNMEASURED_STREAM_SPLITS,
  }));
  const streamSplits =
    snapshot.paginationKey === paginationKey
      ? snapshot.splits
      : UNMEASURED_STREAM_SPLITS;
  const onStreamSplitsChange = useCallback(
    (next: number[]) => {
      setSnapshot((previous) => {
        if (activePaginationKeyRef.current !== paginationKey) return previous;
        if (
          previous.paginationKey === paginationKey &&
          areSameStreamSplits(previous.splits, next)
        ) {
          return previous;
        }
        return { paginationKey, splits: next };
      });
    },
    [paginationKey],
  );

  return { streamSplits, onStreamSplitsChange };
}

export interface UseReaderPaginationOptions {
  useBookSpread: boolean;
  useStreamReader: boolean;
  useSpreadDoubleColumn: boolean;
  streamSplits: number[];
  readerStream: ReaderStreamUnit[];
}

export function useReaderPagination({
  useBookSpread,
  useStreamReader,
  useSpreadDoubleColumn,
  streamSplits,
  readerStream,
}: UseReaderPaginationOptions) {
  const navStreamSplits = useMemo(
    () =>
      useBookSpread && readerStream.length > 0
        ? ensureSpreadPageSplits(streamSplits, readerStream)
        : streamSplits,
    [useBookSpread, readerStream, streamSplits],
  );

  const streamSplitsReady = useSpreadDoubleColumn
    ? isSpreadDoubleColumnSplitsReady(navStreamSplits, readerStream.length)
    : isStreamSplitsReady(navStreamSplits, readerStream.length);

  const totalStreamPages = streamSplitsReady
    ? streamPageCount(navStreamSplits, readerStream.length)
    : 1;

  return {
    navStreamSplits,
    streamSplitsReady,
    totalStreamPages,
  };
}
