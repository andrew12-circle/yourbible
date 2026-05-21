import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  clampArtifactPipLayout,
  defaultArtifactPipLayout,
  maxPipVideoWidthForTopLeft,
  PIP_MIN_W,
  PIP_ENTER_DELAY_MS,
  PIP_EXIT_DELAY_MS,
  PIP_ENTER_CANCEL_RATIO,
  PIP_EXIT_VISIBLE_RATIO,
  PIP_IO_THRESHOLDS,
  pipVisibilitySignal,
  shouldUseScrollRootForPipIo,
  readPipLayoutFromSession,
  writePipLayoutToSession,
  type ArtifactPipLayout,
  type ArtifactPlayerShellRect,
} from "@/lib/framework/artifactYoutubePip";
import { ARTIFACT_VIDEO_DESKTOP_MIN_PX } from "@/lib/framework/artifactSurfaces";

type PipPointerSession =
  | { kind: "drag"; pointerId: number; startX: number; startY: number; startL: number; startT: number; width: number }
  | { kind: "resize"; pointerId: number; startX: number; startY: number; startL: number; startT: number; startW: number };

function shellRectsEqual(
  a: ArtifactPlayerShellRect | null,
  b: ArtifactPlayerShellRect | null,
): boolean {
  if (!a || !b) return a === b;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

export function useArtifactYoutubePip(options: {
  artifactId: string | undefined;
  enabled: boolean;
  mainScrollRef: RefObject<HTMLDivElement | null>;
  /** Do not enter PiP until the embed is actually ready (avoids orphaning the iframe on load). */
  playerReadyRef?: RefObject<boolean>;
}) {
  const { artifactId, enabled, mainScrollRef, playerReadyRef } = options;
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
  const [inlineShellRect, setInlineShellRect] = useState<ArtifactPlayerShellRect | null>(null);
  const inlineShellRectRef = useRef<ArtifactPlayerShellRect | null>(null);
  const inlineMeasureRafRef = useRef<number | null>(null);
  /** Ignore spurious "enter" until the slot has been visibly in-flow at least once (avoids load-time false PiP). */
  const pipEnterArmedRef = useRef(false);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const ioRootRef = useRef<Element | null>(null);
  const ioTargetRef = useRef<Element | null>(null);

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
      pipEnterArmedRef.current = false;
      return;
    }

    pipEnterArmedRef.current = false;

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

      if (entry.intersectionRatio >= PIP_ENTER_CANCEL_RATIO) {
        pipEnterArmedRef.current = true;
      }

      const signal = pipVisibilitySignal(pipModeRef.current, entry.intersectionRatio);

      switch (signal) {
        case "enter":
          if (!pipEnterArmedRef.current) break;
          if (playerReadyRef && !playerReadyRef.current) break;
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
      const scrollRoot = mainScrollRef.current;
      const splitPaneScroll = window.matchMedia(`(min-width: ${ARTIFACT_VIDEO_DESKTOP_MIN_PX}px)`).matches;
      const useScrollRootAsRoot = shouldUseScrollRootForPipIo(scrollRoot, target, splitPaneScroll);
      const desiredRoot = useScrollRootAsRoot ? scrollRoot : null;
      if (
        ioRef.current &&
        ioTargetRef.current === target &&
        ioRootRef.current === desiredRoot
      ) {
        return;
      }
      ioRef.current?.disconnect();
      ioTargetRef.current = target;
      ioRootRef.current = desiredRoot;
      ioRef.current = new IntersectionObserver(onIntersection, {
        threshold: [...PIP_IO_THRESHOLDS],
        root: desiredRoot,
      });
      ioRef.current.observe(target);

      const slotRect = target.getBoundingClientRect();
      if (slotRect.width >= 8 && slotRect.height >= 8) {
        const next: ArtifactPlayerShellRect = {
          left: slotRect.left,
          top: slotRect.top,
          width: slotRect.width,
          height: slotRect.height,
        };
        if (!shellRectsEqual(inlineShellRectRef.current, next)) {
          inlineShellRectRef.current = next;
          setInlineShellRect(next);
        }
      }

      const rootRect =
        desiredRoot instanceof Element ? desiredRoot.getBoundingClientRect() : null;
      const targetRect = target.getBoundingClientRect();
      const visibleTop = rootRect
        ? Math.max(targetRect.top, rootRect.top)
        : Math.max(targetRect.top, 0);
      const visibleBottom = rootRect
        ? Math.min(targetRect.bottom, rootRect.bottom)
        : Math.min(targetRect.bottom, window.innerHeight);
      const visibleH = Math.max(0, visibleBottom - visibleTop);
      if (visibleH >= targetRect.height * PIP_ENTER_CANCEL_RATIO) {
        pipEnterArmedRef.current = true;
      }
    };

    attach();
    let pollFrames = 0;
    const pollAttach = () => {
      attach();
      pollFrames += 1;
      if (pollFrames < 48) pollRaf = window.requestAnimationFrame(pollAttach);
    };
    let pollRaf = window.requestAnimationFrame(pollAttach);
    const onResize = () => attach();
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(pollRaf);
      clearTimers();
      ioRef.current?.disconnect();
      ioRef.current = null;
      ioRootRef.current = null;
      ioTargetRef.current = null;
      window.removeEventListener("resize", onResize);
    };
  }, [enabled, mainScrollRef]);

  /** Keep the iframe on `document.body` and move only CSS — avoids reparent pauses on PiP enter/exit. */
  useEffect(() => {
    if (!enabled || pipMode) {
      if (inlineMeasureRafRef.current != null) {
        window.cancelAnimationFrame(inlineMeasureRafRef.current);
        inlineMeasureRafRef.current = null;
      }
      return;
    }

    const measure = () => {
      inlineMeasureRafRef.current = null;
      const el = videoSlotRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const next: ArtifactPlayerShellRect = {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      };
      if (shellRectsEqual(inlineShellRectRef.current, next)) return;
      inlineShellRectRef.current = next;
      setInlineShellRect(next);
    };

    const scheduleMeasure = () => {
      if (inlineMeasureRafRef.current != null) return;
      inlineMeasureRafRef.current = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();
    const ro = new ResizeObserver(scheduleMeasure);
    const slot = videoSlotRef.current;
    if (slot) ro.observe(slot);

    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);
    const scrollRoot = mainScrollRef.current;
    scrollRoot?.addEventListener("scroll", scheduleMeasure, { passive: true });

    return () => {
      if (inlineMeasureRafRef.current != null) {
        window.cancelAnimationFrame(inlineMeasureRafRef.current);
        inlineMeasureRafRef.current = null;
      }
      ro.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
      scrollRoot?.removeEventListener("scroll", scheduleMeasure);
    };
  }, [enabled, pipMode, mainScrollRef]);

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
    setPipMode(false);
    pipEnterArmedRef.current = true;
    const scrollRoot = mainScrollRef.current;
    scrollRoot?.scrollTo({ top: 0, behavior: "smooth" });
    videoSlotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [mainScrollRef]);

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
    detachPlayerShell: enabled,
    inlineShellRect,
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
