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
    window.addEventListener("resize", attach);
    return () => {
      window.cancelAnimationFrame(raf);
      clearTimers();
      io?.disconnect();
      window.removeEventListener("resize", attach);
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
      setPipLayout(current);
      writePipLayoutToSession(artifactId, current);
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
    [artifactId],
  );

  const onPipDragHeaderPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = pipPointerRef.current;
      if (!s || s.kind !== "drag" || s.pointerId !== e.pointerId || !artifactId) return;
      const next = clampArtifactPipLayout({
        left: s.startL + (e.clientX - s.startX),
        top: s.startT + (e.clientY - s.startY),
        width: s.width,
      });
      setPipLayout(next);
      writePipLayoutToSession(artifactId, next);
    },
    [artifactId],
  );

  const onPipDragHeaderPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = pipPointerRef.current;
    if (s?.pointerId === e.pointerId) pipPointerRef.current = null;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onPipResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 || !artifactId) return;
      e.stopPropagation();
      const current = clampArtifactPipLayout(pipLayoutRef.current ?? defaultArtifactPipLayout());
      setPipLayout(current);
      writePipLayoutToSession(artifactId, current);
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
    [artifactId],
  );

  const onPipResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const s = pipPointerRef.current;
      if (!s || s.kind !== "resize" || s.pointerId !== e.pointerId || !artifactId) return;
      const dw = e.clientX - s.startX;
      const maxW = maxPipVideoWidthForTopLeft(s.startL, s.startT);
      const w = Math.min(Math.max(PIP_MIN_W, s.startW + dw), maxW);
      const next = clampArtifactPipLayout({ left: s.startL, top: s.startT, width: w });
      setPipLayout(next);
      writePipLayoutToSession(artifactId, next);
    },
    [artifactId],
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

  return {
    videoSlotRef,
    pipMode,
    pipOverlayLayout,
    scrollVideoIntoView,
    onPipDragHeaderPointerDown,
    onPipDragHeaderPointerMove,
    onPipDragHeaderPointerUp,
    onPipResizePointerDown,
    onPipResizePointerMove,
    onPipResizePointerUp,
  };
}
