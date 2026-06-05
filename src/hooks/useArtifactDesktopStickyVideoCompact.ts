import { useEffect, useState, type RefObject } from "react";

/**
 * Desktop study column: full-width video at scroll top; compact sticky mini-player once
 * the sentinel scrolls out of the study pane (scroll back up restores the large player).
 */
export function useArtifactDesktopStickyVideoCompact(
  scrollRef: RefObject<HTMLDivElement | null>,
  sentinelRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setCompact(false);
      return;
    }

    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setCompact(!entry.isIntersecting);
      },
      { root, threshold: 0 },
    );

    io.observe(sentinel);
    return () => io.disconnect();
  }, [enabled, scrollRef, sentinelRef]);

  return compact;
}
