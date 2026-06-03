import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampArtifactPipLayout,
  defaultArtifactPipLayout,
  maxPipVideoWidthForTopLeft,
  PIP_MIN_W,
  readPipLayoutFromSession,
  writePipLayoutToSession,
  type ArtifactPipLayout,
} from "@/lib/framework/artifactYoutubePip";

type PipPointerSession =
  | { kind: "drag"; pointerId: number; startX: number; startY: number; startL: number; startT: number; width: number }
  | { kind: "resize"; pointerId: number; startX: number; startY: number; startL: number; startT: number; startW: number };

export function useArtifactPipLayoutGestures(artifactId: string | undefined, initialLayout?: ArtifactPipLayout) {
  const [pipLayout, setPipLayout] = useState<ArtifactPipLayout | null>(() =>
    initialLayout ? clampArtifactPipLayout(initialLayout) : null,
  );
  const pipLayoutRef = useRef<ArtifactPipLayout | null>(pipLayout);
  pipLayoutRef.current = pipLayout;
  const pipPointerRef = useRef<PipPointerSession | null>(null);
  const pipDragRafRef = useRef<number | null>(null);

  const commitPipLayout = useCallback(
    (next: ArtifactPipLayout, persist = true) => {
      const clamped = clampArtifactPipLayout(next);
      pipLayoutRef.current = clamped;
      setPipLayout(clamped);
      if (persist && artifactId) writePipLayoutToSession(artifactId, clamped);
    },
    [artifactId],
  );

  const schedulePipLayoutDuringGesture = useCallback((next: ArtifactPipLayout) => {
    pipLayoutRef.current = clampArtifactPipLayout(next);
    if (pipDragRafRef.current != null) return;
    pipDragRafRef.current = window.requestAnimationFrame(() => {
      pipDragRafRef.current = null;
      if (pipLayoutRef.current) setPipLayout(pipLayoutRef.current);
    });
  }, []);

  const finishPipGesture = useCallback(() => {
    if (pipDragRafRef.current != null) {
      window.cancelAnimationFrame(pipDragRafRef.current);
      pipDragRafRef.current = null;
    }
    if (pipLayoutRef.current && artifactId) {
      writePipLayoutToSession(artifactId, pipLayoutRef.current);
    }
  }, [artifactId]);

  useEffect(() => {
    if (!artifactId) return;
    const saved = readPipLayoutFromSession(artifactId);
    setPipLayout(saved ? clampArtifactPipLayout(saved) : clampArtifactPipLayout(defaultArtifactPipLayout()));
  }, [artifactId]);

  useEffect(() => {
    if (!artifactId) return;
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
  }, [artifactId]);

  const pipOverlayLayout = useMemo(
    () => clampArtifactPipLayout(pipLayout ?? initialLayout ?? defaultArtifactPipLayout()),
    [initialLayout, pipLayout],
  );

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
    [artifactId, schedulePipLayoutDuringGesture],
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
    [artifactId, schedulePipLayoutDuringGesture],
  );

  const onPipResizePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const s = pipPointerRef.current;
    if (s?.pointerId === e.pointerId) pipPointerRef.current = null;
    finishPipGesture();
    try {
      (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, [finishPipGesture]);

  return {
    pipOverlayLayout,
    commitPipLayout,
    onPipDragHeaderPointerDown,
    onPipDragHeaderPointerMove,
    onPipDragHeaderPointerUp,
    onPipResizePointerDown,
    onPipResizePointerMove,
    onPipResizePointerUp,
  };
}
