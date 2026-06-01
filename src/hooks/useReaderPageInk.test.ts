import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useReaderPageInk } from "./useReaderPageInk";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
          }),
        }),
      }),
      upsert: async () => ({ error: null }),
    }),
  },
}));

const pageKey = { book: "GEN", chapter: 1, pageIndex: 0, side: "left" as const };

describe("useReaderPageInk", () => {
  beforeEach(() => {
    localStorage.clear();
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
});
