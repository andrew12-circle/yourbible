import { useCallback, useRef, useState } from "react";
import type { MyAiResearchScope } from "@/lib/myai/researchScope";

export type MyAiQueuedTurn = {
  text: string;
  scope?: MyAiResearchScope;
};

/**
 * Queue follow-up turns while a reply is still streaming.
 * Typing stays open; Send while busy enqueues; flush runs when idle.
 */
export function useMyAiSendQueue() {
  const queueRef = useRef<MyAiQueuedTurn[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);

  const syncCount = useCallback(() => {
    setQueuedCount(queueRef.current.length);
  }, []);

  const enqueue = useCallback(
    (text: string, scope?: MyAiResearchScope) => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      queueRef.current = [...queueRef.current, { text: trimmed, scope }];
      syncCount();
      return true;
    },
    [syncCount],
  );

  const dequeue = useCallback((): MyAiQueuedTurn | null => {
    const [next, ...rest] = queueRef.current;
    if (!next) return null;
    queueRef.current = rest;
    syncCount();
    return next;
  }, [syncCount]);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    syncCount();
  }, [syncCount]);

  const peek = useCallback((): MyAiQueuedTurn | null => queueRef.current[0] ?? null, []);

  return {
    queuedCount,
    enqueue,
    dequeue,
    clearQueue,
    peek,
  };
}
