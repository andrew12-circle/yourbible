import { useMemo } from "react";
import {
  ensureSpreadPageSplits,
  isSpreadDoubleColumnSplitsReady,
  isStreamSplitsReady,
  streamPageCount,
  type ReaderStreamUnit,
} from "@/lib/bible/readerStream";

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
