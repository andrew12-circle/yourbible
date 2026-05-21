import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  clampArtifactPipLayout,
  defaultArtifactPipLayout,
  maxPipVideoWidthForTopLeft,
  PIP_MIN_W,
  PIP_ENTER_DELAY_MS,
  PIP_EXIT_DELAY_MS,
  PIP_IO_THRESHOLDS,
  pipVisibilitySignal,
  readPipLayoutFromSession,
  writePipLayoutToSession,
  type ArtifactPipLayout,
} from "@/lib/framework/artifactYoutubePip";

type PipPointerSession =
  | { kind: "drag"; pointerId: number; startX: number; startY: number; startL: number; startT: number; width: number }
  | { kind: "resize"; pointerId: number; startX: number; startY: number; startL: number; startT: number; startW: number };

export function useArtifactYoutubePip(options: {
  artifactId: string | undefined;
  enabled: boolean;
  mainScrollRef: RefObject<HTMLDivElement | null>;
}) {
  const { artifactId, enabled, mainScrollRef } = options;
  const videoSlotRef = useRef<HTMLDivElement | null>(null);
  const [pipMode, setPipMode] = useState(false);
  const pipModeRef = useRef(false);
  pipModeRef.current = pipMode;
  const [pipLayout, setPipLayout] = useState<ArtifactPipLayout | null>(null);
  const pipLayoutRef = useRef<ArtifactPipLayout | null>(null);
  pipLayoutRef.current = pipLayout;
  const pipPointerRef = useRef<PipPointerSession | null>(null);
  const pipDragRafRef = useRef<number | null>(null);
  const [pipLayoutSyncKey, setPipLayoutSyncKey] = useState(0);

  const commitPipLayout = useCallback(
    (next: ArtifactPipLayout, persist = true) => {
      const clamped = clampArtifactPipLayout(next);
      pipLayoutRef.current = clamped;
      setPipLayout(clamped);
      if (persist && artifactId) writePipLayoutToSession(artifactId, clamped);
    },
    [artifactId],
  );

  const schedulePipLayoutDuringGesture = useCallback(
    (next: ArtifactPipLayout) => {
      pipLayoutRef.current = clampArtifactPipLayout(next);
      if (pipDragRafRef.current != null) return;
      pipDragRafRef.current = window.requestAnimationFrame(() => {
        pipDragRafRef.current = null;
        if (pipLayoutRef.current) setPipLayout(pipLayoutRef.current);
      });
    },
    [],
  );

  const finishPipGesture = useCallback(() => {
    if (pipDragRafRef.current != null) {
      window.cancelAnimationFrame(pipDragRafRef.current);
      pipDragRafRef.current = null;
    }
    if (pipLayoutRef.current && artifactId) {
      writePipLayoutToSession(artifactId, pipLayoutRef.current);
    }
    setPipLayoutSyncKey((k) => k + 1);
  }, [artifactId]);

  useEffect(() => {
    if (!enabled) {
      setPipMode(false);
      return;
    }

    let io: IntersectionObserver | null = null;
    let enterTimer: ReturnType<typeof setTimeout> | null = null;
    let exitTimer: ReturnType<typeof setTimeout> | null = null;

    const clearEnterTimer = () => {
      if (enterTimer != null) {
        clearTimeout(enterTimer);
        enterTimer = null;
      }
    };

    const clearExitTimer = () => {
      if (exitTimer != null) {
        clearTimeout(exitTimer);
        exitTimer = null;
      }
    };

    const clearTimers = () => {
      clearEnterTimer();
      clearExitTimer();
    };

    const onIntersection = (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;

      const signal = pipVisibilitySignal(pipModeRef.current, entry.intersectionRatio);

      switch (signal) {
        case "enter":
          clearExitTimer();
          if (enterTimer == null) {
            enterTimer = setTimeout(() => {
              enterTimer = null;
              setPipMode(true);
            }, PIP_ENTER_DELAY_MS);
          }
          break;
        case "exit":
          clearEnterTimer();
          if (exitTimer == null) {
            exitTimer = setTimeout(() => {
              exitTimer = null;
              setPipMode(false);
            }, PIP_EXIT_DELAY_MS);
          }
          break;
        case "cancel_enter":
          clearEnterTimer();
          break;
        case "cancel_exit":
          clearExitTimer();
          break;
        case "hold":
          break;
      }
    };

    const attach = () => {
      const target = videoSlotRef.current;
      if (!target) return;
      io?.disconnect();
      const scrollRoot = mainScrollRef.current;
      const root =
        scrollRoot && window.matchMedia("(min-width: 1024px)").matches ? scrollRoot : null;
      io = new IntersectionObserver(onIntersection, {
        threshold: [...PIP_IO_THRESHOLDS],
        root,
      });
      io.observe(target);
    };

    attach();
    const raf = window.requestAnimationFrame(attach);
    const onScrollOrResize = () => attach();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    const scrollRoot = mainScrollRef.current;
    scrollRoot?.addEventListener("scroll", onScrollOrResize, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      clearTimers();
      io?.disconnect();
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      scrollRoot?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [enabled, mainScrollRef]);

  useEffect(() => {
    if (!artifactId) return;
    const saved = readPipLayoutFromSession(artifactId);
    setPipLayout(saved ? clampArtifactPipLayout(saved) : null);
  }, [artifactId]);

  useEffect(() => {
    if (!pipMode || !artifactId) return;
    setPipLayout((prev) =>
      prev == null ? clampArtifactPipLayout(defaultArtifactPipLayout()) : clampArtifactPipLayout(prev),
    );
    setPipLayoutSyncKey((k) => k + 1);
  }, [pipMode, artifactId]);

  useEffect(() => {
    if (!pipMode || !artifactId) return;
    const onResize = () => {
      setPipLayout((prev) => {
        const base = prev ?? defaultArtifactPipLayout();
        const next = clampArtifactPipLayout(base);
        writePipLayoutToSession(artifactId, next);
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pipMode, artifactId]);

  const scrollVideoIntoView = useCallback(() => {
    videoSlotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const onPipDragHeaderPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !artifactId) return;
      const current = clampArtifactPipLayout(pipLayoutRef.current ?? defaultArtifactPipLayout());
      commitPipLayout(current);
      pipPointerRef.current = {
        kind: "drag",
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startL: current.left,
        startT: current.top,
        width: current.width,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [artifactId, commitPipLayout],
  );

  const onPipDragHeaderPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = pipPointerRef.current;
      if (!s || s.kind !== "drag" || s.pointerId !== e.pointerId || !artifactId) return;
      schedulePipLayoutDuringGesture({
        left: s.startL + (e.clientX - s.startX),
        top: s.startT + (e.clientY - s.startY),
        width: s.width,
      });
    },
    [artifactId],
  );

  const onPipDragHeaderPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = pipPointerRef.current;
      if (s?.pointerId === e.pointerId) {
        pipPointerRef.current = null;
        finishPipGesture();
      }
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [finishPipGesture],
  );

  const onPipResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 || !artifactId) return;
      e.stopPropagation();
      const current = clampArtifactPipLayout(pipLayoutRef.current ?? defaultArtifactPipLayout());
      commitPipLayout(current);
      pipPointerRef.current = {
        kind: "resize",
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startL: current.left,
        startT: current.top,
        startW: current.width,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [artifactId, commitPipLayout],
  );

  const onPipResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const s = pipPointerRef.current;
      if (!s || s.kind !== "resize" || s.pointerId !== e.pointerId || !artifactId) return;
      const dw = e.clientX - s.startX;
      const maxW = maxPipVideoWidthForTopLeft(s.startL, s.startT);
      const w = Math.min(Math.max(PIP_MIN_W, s.startW + dw), maxW);
      schedulePipLayoutDuringGesture({ left: s.startL, top: s.startT, width: w });
    },
    [schedulePipLayoutDuringGesture],
  );

  const onPipResizePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const s = pipPointerRef.current;
    if (s?.pointerId === e.pointerId) pipPointerRef.current = null;
    try {
      (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  /** Layout for the portaled PiP shell — kept mounted so the iframe is not destroyed on exit. */
  const pipOverlayLayout = useMemo(
    () => clampArtifactPipLayout(pipLayout ?? defaultArtifactPipLayout()),
    [pipLayout],
  );

  /** Coarse key for YouTube iframe resize — bumps on inline/PiP switch and after drag/resize ends. */
  const youtubeLayoutKey = useMemo(
    () => (pipMode ? `pip:w${pipOverlayLayout.width}:k${pipLayoutSyncKey}` : "inline"),
    [pipMode, pipOverlayLayout.width, pipLayoutSyncKey],
  );

  return {
    videoSlotRef,
    pipMode,
    pipOverlayLayout,
    youtubeLayoutKey,
    scrollVideoIntoView,
    onPipDragHeaderPointerDown,
    onPipDragHeaderPointerMove,
    onPipDragHeaderPointerUp,
    onPipResizePointerDown,
    onPipResizePointerMove,
    onPipResizePointerUp,
  };
}
