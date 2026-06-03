import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readerInkStorageKey } from "@/lib/ink/layoutFingerprint";
import { saveLocalReaderInk } from "@/lib/ink/localInkStore";
import ReaderInkLayer from "./ReaderInkLayer";

const pageKey = { book: "GEN", chapter: 1, pageIndex: 0, side: "left" as const };

const anchorRect = {
  bottom: 600,
  height: 600,
  left: 40,
  top: 80,
  right: 440,
  width: 400,
  x: 40,
  y: 80,
  toJSON: () => ({}),
} as DOMRect;

let maybeSingleImpl: () => Promise<{ data: { strokes: unknown[] } | null }> = async () => ({
  data: null,
});

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

function dispatchPointer(
  target: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  pointerId: number,
  x: number,
  y: number,
) {
  const clientX = anchorRect.left + x;
  const clientY = anchorRect.top + y;
  const init = {
    clientX,
    clientY,
    pointerId,
    pointerType: "pen",
    pressure: 0.6,
    button: 0,
  };
  if (type === "pointerdown") fireEvent.pointerDown(target, init);
  else if (type === "pointermove") fireEvent.pointerMove(target, init);
  else fireEvent.pointerUp(target, init);
}

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

beforeAll(() => {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
});

describe("ReaderInkLayer", () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    maybeSingleImpl = async () => ({ data: null });

    anchor = document.createElement("div");
    anchor.getBoundingClientRect = () => anchorRect;
    document.body.appendChild(anchor);

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this === anchor || this.dataset.readerInkLayer != null || this.tagName === "CANVAS") {
        return anchorRect;
      }
      return anchorRect;
    });

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    anchor.remove();
    vi.restoreAllMocks();
  });

  it("keeps ink on the canvas after pointerup and saves locally", async () => {
    const onStateChange = vi.fn();

    render(
      <ReaderInkLayer
        layerId="GEN-1-0-left"
        active
        getAnchorEl={() => anchor}
        userId={undefined}
        pageKey={pageKey}
        layoutFingerprint="fp-test"
        anchorVerse={1}
        tool="fountain"
        color="#111827"
        size={4}
        onStateChange={onStateChange}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector("[data-reader-ink-layer]")).toBeTruthy();
    });

    const layer = document.querySelector("[data-reader-ink-layer]") as HTMLElement;
    const canvas = layer.querySelector("canvas");
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);

    await act(async () => {
      dispatchPointer(layer, "pointerdown", 1, 80, 120);
      dispatchPointer(layer, "pointermove", 1, 140, 160);
      dispatchPointer(layer, "pointerup", 1, 140, 160);
    });

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        "GEN-1-0-left",
        expect.objectContaining({ canUndo: true }),
      );
    });

    const storageKey = readerInkStorageKey("fp-test", "GEN", 1, 0, "left");
    const raw = localStorage.getItem(storageKey);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).strokes).toHaveLength(1);
  });

  it("does not wipe ink when supabase returns an empty stroke array", async () => {
    saveLocalReaderInk("fp-test", pageKey.book, pageKey.chapter, pageKey.pageIndex, pageKey.side, [
      {
        tool: "fountain",
        color: "#111827",
        size: 4,
        points: [{ x: 0.2, y: 0.3, p: 0.5 }],
      },
    ]);

    let resolveRemote: (value: { data: { strokes: unknown[] } }) => void = () => {};
    const remotePromise = new Promise<{ data: { strokes: unknown[] } }>((resolve) => {
      resolveRemote = resolve;
    });
    maybeSingleImpl = () => remotePromise;

    const onStateChange = vi.fn();

    render(
      <ReaderInkLayer
        layerId="GEN-1-0-left"
        active
        getAnchorEl={() => anchor}
        userId="user-1"
        pageKey={pageKey}
        layoutFingerprint="fp-test"
        anchorVerse={1}
        tool="fountain"
        color="#111827"
        size={4}
        onStateChange={onStateChange}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector("[data-reader-ink-layer]")).toBeTruthy();
    });

    await act(async () => {
      resolveRemote({ data: { strokes: [] } });
      await remotePromise;
    });

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        "GEN-1-0-left",
        expect.objectContaining({ canUndo: true }),
      );
    });
  });

  it("keeps a new stroke visible after layout fingerprint changes", async () => {
    const onStateChange = vi.fn();

    const { rerender } = render(
      <ReaderInkLayer
        layerId="GEN-1-0-left"
        active
        getAnchorEl={() => anchor}
        userId={undefined}
        pageKey={pageKey}
        layoutFingerprint="fp-old"
        anchorVerse={1}
        tool="fountain"
        color="#111827"
        size={4}
        onStateChange={onStateChange}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector("[data-reader-ink-layer]")).toBeTruthy();
    });

    const layer = document.querySelector("[data-reader-ink-layer]") as HTMLElement;

    await act(async () => {
      dispatchPointer(layer, "pointerdown", 2, 60, 90);
      dispatchPointer(layer, "pointermove", 2, 120, 140);
      dispatchPointer(layer, "pointerup", 2, 120, 140);
    });

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        "GEN-1-0-left",
        expect.objectContaining({ canUndo: true }),
      );
    });

    rerender(
      <ReaderInkLayer
        layerId="GEN-1-0-left"
        active
        getAnchorEl={() => anchor}
        userId={undefined}
        pageKey={pageKey}
        layoutFingerprint="fp-new"
        anchorVerse={1}
        tool="fountain"
        color="#111827"
        size={4}
        onStateChange={onStateChange}
      />,
    );

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        "GEN-1-0-left",
        expect.objectContaining({ canUndo: true }),
      );
    });

    expect(localStorage.getItem(readerInkStorageKey("fp-new", "GEN", 1, 0, "left"))).toBeTruthy();
  });

  it("keeps ink after a parent re-render (simulated toolbar state update)", async () => {
    const onStateChange = vi.fn();
    let toolbarCollapsed = false;

    const Harness = ({ collapsed }: { collapsed: boolean }) => (
      <>
        {collapsed ? <div data-toolbar-collapsed /> : null}
        <ReaderInkLayer
          layerId="GEN-1-0-left"
          active
          getAnchorEl={() => anchor}
          userId={undefined}
          pageKey={pageKey}
          layoutFingerprint="fp-rerender"
          anchorVerse={1}
          tool="fountain"
          color="#111827"
          size={4}
          onStateChange={onStateChange}
        />
      </>
    );

    const { rerender } = render(<Harness collapsed={toolbarCollapsed} />);

    await waitFor(() => {
      expect(document.querySelector("[data-reader-ink-layer]")).toBeTruthy();
    });

    const layer = document.querySelector("[data-reader-ink-layer]") as HTMLElement;

    await act(async () => {
      dispatchPointer(layer, "pointerdown", 3, 70, 100);
      dispatchPointer(layer, "pointermove", 3, 130, 150);
      dispatchPointer(layer, "pointerup", 3, 130, 150);
    });

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        "GEN-1-0-left",
        expect.objectContaining({ canUndo: true }),
      );
    });

    toolbarCollapsed = true;
    rerender(<Harness collapsed={toolbarCollapsed} />);

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        "GEN-1-0-left",
        expect.objectContaining({ canUndo: true }),
      );
    });

    const storageKey = readerInkStorageKey("fp-rerender", "GEN", 1, 0, "left");
    expect(JSON.parse(localStorage.getItem(storageKey)!).strokes).toHaveLength(1);
  });
});
