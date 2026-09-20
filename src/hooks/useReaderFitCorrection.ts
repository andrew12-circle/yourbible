import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface ReaderFitPrefix { contentKey: string; splits: number[] }
const EMPTY_PREFIX: ReaderFitPrefix = { contentKey: "", splits: [0] };

/** Correct only the unread suffix; already-read page boundaries must not move. */
export function useReaderFitCorrection(scope: string) {
  // Identity, rather than the scope string alone, distinguishes A → B → A.
  // A delayed report from the first layout A must not revive its old page cuts.
  const generation = useMemo(() => ({ scope }), [scope]);
  const committedGeneration = useRef<typeof generation | null>(generation);
  useLayoutEffect(() => {
    committedGeneration.current = generation;
    return () => { committedGeneration.current = null; };
  }, [generation]);

  const [snapshot, setSnapshot] = useState(() => ({ generation, reserve: 0, attempts: 0, prefix: EMPTY_PREFIX }));
  const active = snapshot.generation === generation
    ? snapshot
    : { generation, reserve: 0, attempts: 0, prefix: EMPTY_PREFIX };
  const { reserve, attempts, prefix } = active;
  const requestCorrection = useCallback((overflowPx: number, nextPrefix = EMPTY_PREFIX) => {
    if (!Number.isFinite(overflowPx) || overflowPx <= 0 || committedGeneration.current !== generation) return;
    setSnapshot((old) => {
      // React can apply a queued update after another layout has committed.
      if (committedGeneration.current !== generation) return old;
      const current = old.generation === generation
        ? old
        : { generation, reserve: 0, attempts: 0, prefix: EMPTY_PREFIX };
      if (current.reserve !== reserve || current.attempts >= 4) return old;
      const extra = Math.min(64, Math.max(16, Math.ceil(overflowPx) + 2));
      return { generation, reserve: current.reserve + extra, attempts: current.attempts + 1,
        prefix: { contentKey: nextPrefix.contentKey, splits: nextPrefix.splits.slice() } };
    });
  }, [generation, reserve]);
  return { reserve, prefix, canCorrect: attempts < 4, requestCorrection };
}
