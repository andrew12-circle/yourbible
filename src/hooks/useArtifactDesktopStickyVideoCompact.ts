import { useEffect, useState, type RefObject } from "react";

const EXPAND_AT_SCROLL_TOP_PX = 24;
const REF_ATTACH_MAX_FRAMES = 48;

function attachWhenReady(
  scrollRef: RefObject<HTMLDivElement | null>,
  videoRef: RefObject<HTMLDivElement | null>,
  onReady: (root: HTMLDivElement, target: HTMLElement) => () => void,
) {
  const root = scrollRef.current;
  const target = videoRef.current;
  if (root && target) return onReady(root, target);

  let frames = 0;
  let cleanup: (() => void) | undefined;
  let cancelled = false;

  const poll = () => {
    if (cancelled) return;
    const nextRoot = scrollRef.current;
    const nextTarget = videoRef.current;
    if (nextRoot && nextTarget) {
      cleanup = onReady(nextRoot, nextTarget);
      return;
    }
    frames += 1;
    if (frames < REF_ATTACH_MAX_FRAMES) {
      requestAnimationFrame(poll);
    }
  };

  requestAnimationFrame(poll);

  return () => {
    cancelled = true;
    cleanup?.();
  };
}

/**
 * Desktop study column: full-width video scrolls off naturally, then a compact sticky
 * mini-player takes over at the top. Scrolling back to the top restores the large player.
 */
export function useArtifactDesktopStickyVideoCompact(
  scrollRef: RefObject<HTMLDivElement | null>,
  videoRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setCompact(false);
    }
  }, [enabled]);

  /** Full-size player scrolled completely above the study pane → shrink and stick. */
  useEffect(() => {
    if (!enabled || compact) return;

    return attachWhenReady(scrollRef, videoRef, (root, target) => {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry || entry.isIntersecting) return;
          const rootTop = entry.rootBounds?.top ?? root.getBoundingClientRect().top;
          if (entry.boundingClientRect.bottom <= rootTop + 1) {
            setCompact(true);
          }
        },
        { root, threshold: 0 },
      );

      io.observe(target);
      return () => io.disconnect();
    });
  }, [compact, enabled, scrollRef, videoRef]);

  /** Near the top again → restore the large in-flow player. */
  useEffect(() => {
    if (!enabled || !compact) return;

    return attachWhenReady(scrollRef, videoRef, (root) => {
      const onScroll = () => {
        if (root.scrollTop <= EXPAND_AT_SCROLL_TOP_PX) {
          setCompact(false);
        }
      };

      root.addEventListener("scroll", onScroll, { passive: true });
      return () => root.removeEventListener("scroll", onScroll);
    });
  }, [compact, enabled, scrollRef, videoRef]);

  return compact;
}

export { EXPAND_AT_SCROLL_TOP_PX };
