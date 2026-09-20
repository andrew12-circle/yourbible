import { useCallback, useState } from "react";

/** A bounded feedback loop shrinks measured allocations, never the live page or font. */
export function useReaderFitCorrection(scope: string) {
  const [snapshot, setSnapshot] = useState({ scope, reserve: 0, attempts: 0 });
  const active = snapshot.scope === scope ? snapshot : { scope, reserve: 0, attempts: 0 };
  const { reserve, attempts } = active;
  const requestCorrection = useCallback((overflowPx: number) => {
    setSnapshot((old) => {
      const current = old.scope === scope ? old : { scope, reserve: 0, attempts: 0 };
      // Two facing pages can report the same generation; apply one correction.
      if (current.reserve !== reserve || current.attempts >= 4) return old;
      const extra = Math.min(64, Math.max(16, Math.ceil(overflowPx) + 2));
      return { scope, reserve: current.reserve + extra, attempts: current.attempts + 1 };
    });
  }, [scope, reserve]);
  return { reserve, canCorrect: attempts < 4, requestCorrection };
}
