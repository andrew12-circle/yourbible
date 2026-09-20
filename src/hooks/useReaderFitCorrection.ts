import { useCallback, useState } from "react";

export interface ReaderFitPrefix { contentKey: string; splits: number[] }
const EMPTY_PREFIX: ReaderFitPrefix = { contentKey: "", splits: [0] };

/** Correct only the unread suffix; already-read page boundaries must not move. */
export function useReaderFitCorrection(scope: string) {
  const [snapshot, setSnapshot] = useState({ scope, reserve: 0, attempts: 0, prefix: EMPTY_PREFIX });
  const active = snapshot.scope === scope ? snapshot : { scope, reserve: 0, attempts: 0, prefix: EMPTY_PREFIX };
  const { reserve, attempts, prefix } = active;
  const requestCorrection = useCallback((overflowPx: number, nextPrefix = EMPTY_PREFIX) => {
    setSnapshot((old) => {
      const current = old.scope === scope ? old : { scope, reserve: 0, attempts: 0, prefix: EMPTY_PREFIX };
      if (current.reserve !== reserve || current.attempts >= 4) return old;
      const extra = Math.min(64, Math.max(16, Math.ceil(overflowPx) + 2));
      return { scope, reserve: current.reserve + extra, attempts: current.attempts + 1,
        prefix: { contentKey: nextPrefix.contentKey, splits: nextPrefix.splits.slice() } };
    });
  }, [scope, reserve]);
  return { reserve, prefix, canCorrect: attempts < 4, requestCorrection };
}
