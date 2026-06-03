import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { saveLocalReaderInk } from "@/lib/ink/localInkStore";
import { useReaderPageInk } from "./useReaderPageInk";
let maybeSingleImpl: () => Promise<{ data: { strokes: unknown[] } | null }> = async () => ({ data: null });

function createQueryBuilder() {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.eq = chain;
  builder.neq = chain;
  builder.order = chain;
  builder.limit = chain;
  builder.maybeSingle = () => maybeSingleImpl();
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => createQueryBuilder(),
      upsert: async () => ({ error: null }),
    }),
  },
}));

const pageKey = { book: "GEN", chapter: 1, pageIndex: 0, side: "left" as const };

describe("useReaderPageInk", () => {
  beforeEach(() => {
    localStorage.clear();
    maybeSingleImpl = async () => ({ data: null });
  });

  it("keeps new strokes when canvas size updates after drawing", async () => {
    const { result, rerender } = renderHook(
      (props: { canvasSize: { w: number; h: number } }) =>
        useReaderPageInk({
          userId: undefined,
          pageKey,
          layoutFingerprint: "fp1",
          anchorVerse: 1,
          canvasSize: props.canvasSize,
          enabled: true,
        }),
      { initialProps: { canvasSize: { w: 400, h: 600 } } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.pushStroke({
        tool: "fountain",
        color: "#111827",
        size: 4,
        points: [{ x: 40, y: 50, p: 0.5 }],
      });
    });

    expect(result.current.strokes).toHaveLength(1);

    rerender({ canvasSize: { w: 420, h: 610 } });

    expect(result.current.strokes).toHaveLength(1);
    expect(result.current.strokes[0]?.points[0]?.x).toBeCloseTo(42, 0);
  });

  it("persists strokes via liveCanvasSizeRef when state size is still zero", async () => {
    const liveRef = { current: { w: 400, h: 600 } };

    const { result } = renderHook(() =>
      useReaderPageInk({
        userId: undefined,
        pageKey,
        layoutFingerprint: "fp1",
        anchorVerse: 1,
        canvasSize: { w: 0, h: 0 },
        liveCanvasSizeRef: liveRef,
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.pushStroke({
        tool: "fountain",
        color: "#111827",
        size: 4,
        points: [{ x: 40, y: 50, p: 0.5 }],
      });
    });

    expect(result.current.strokes).toHaveLength(1);
  });

  it("does not wipe strokes when async load completes after the user draws", async () => {
    let resolveRemote: (value: { data: null }) => void = () => {};
    const remotePromise = new Promise<{ data: null }>((resolve) => {
      resolveRemote = resolve;
    });
    maybeSingleImpl = () => remotePromise;

    const { result } = renderHook(() =>
      useReaderPageInk({
        userId: "user-1",
        pageKey,
        layoutFingerprint: "fp-slow",
        anchorVerse: 1,
        canvasSize: { w: 400, h: 600 },
        enabled: true,
      }),
    );

    act(() => {
      result.current.pushStroke({
        tool: "fountain",
        color: "#111827",
        size: 4,
        points: [{ x: 40, y: 50, p: 0.5 }],
      });
    });

    expect(result.current.strokes).toHaveLength(1);

    await act(async () => {
      resolveRemote({ data: null });
      await remotePromise;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.strokes).toHaveLength(1);
  });

  it("migrates ink when the layout fingerprint changes", async () => {
    saveLocalReaderInk("fp-old", pageKey.book, pageKey.chapter, pageKey.pageIndex, pageKey.side, [
      {
        tool: "fountain",
        color: "#111827",
        size: 4,
        points: [{ x: 0.1, y: 0.2, p: 0.5 }],
      },
    ]);

    const { result } = renderHook(() =>
      useReaderPageInk({
        userId: undefined,
        pageKey,
        layoutFingerprint: "fp-new",
        anchorVerse: 1,
        canvasSize: { w: 400, h: 600 },
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.strokes).toHaveLength(1);
    expect(localStorage.getItem("yb.reader.ink.fp-new.GEN.1.0.left")).toBeTruthy();
  });

  it("saves strokes to localStorage immediately after drawing", async () => {
    const { result } = renderHook(() =>
      useReaderPageInk({
        userId: undefined,
        pageKey,
        layoutFingerprint: "fp-local",
        anchorVerse: 1,
        canvasSize: { w: 400, h: 600 },
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.pushStroke({
        tool: "fountain",
        color: "#111827",
        size: 4,
        points: [{ x: 40, y: 50, p: 0.5 }],
      });
    });

    const raw = localStorage.getItem("yb.reader.ink.fp-local.GEN.1.0.left");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).strokes).toHaveLength(1);
  });

  it("does not replace local ink when supabase returns an empty stroke array", async () => {
    saveLocalReaderInk("fp-empty", pageKey.book, pageKey.chapter, pageKey.pageIndex, pageKey.side, [
      {
        tool: "fountain",
        color: "#111827",
        size: 4,
        points: [{ x: 0.2, y: 0.3, p: 0.5 }],
      },
    ]);

    maybeSingleImpl = async () => ({ data: { strokes: [] } });

    const { result } = renderHook(() =>
      useReaderPageInk({
        userId: "user-1",
        pageKey,
        layoutFingerprint: "fp-empty",
        anchorVerse: 1,
        canvasSize: { w: 400, h: 600 },
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.strokes).toHaveLength(1);
  });

  it("keeps denormalized strokes when canvas size briefly hits zero", async () => {
    const { result, rerender } = renderHook(
      (props: { canvasSize: { w: number; h: number } }) =>
        useReaderPageInk({
          userId: undefined,
          pageKey,
          layoutFingerprint: "fp-zero",
          anchorVerse: 1,
          canvasSize: props.canvasSize,
          enabled: true,
        }),
      { initialProps: { canvasSize: { w: 400, h: 600 } } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.pushStroke({
        tool: "fountain",
        color: "#111827",
        size: 4,
        points: [{ x: 40, y: 50, p: 0.5 }],
      });
    });

    expect(result.current.strokes).toHaveLength(1);

    rerender({ canvasSize: { w: 0, h: 0 } });

    expect(result.current.strokes).toHaveLength(1);
  });
});
