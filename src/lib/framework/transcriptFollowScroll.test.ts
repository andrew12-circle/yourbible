import { describe, expect, it, vi } from "vitest";
import {
  isTranscriptRowInFollowViewport,
  readMobileDockBottomInset,
  readMobileTranscriptFollowInsets,
  scrollTranscriptRowIntoFollowViewport,
  TRANSCRIPT_FOLLOW_MOBILE_VISIBLE_BIAS,
  type TranscriptFollowViewportInsets,
} from "@/lib/framework/transcriptFollowScroll";

function mockRect(el: HTMLElement, rect: Partial<DOMRect>) {
  el.getBoundingClientRect = () =>
    ({
      x: rect.left ?? 0,
      y: rect.top ?? 0,
      width: rect.width ?? 100,
      height: rect.height ?? 20,
      top: rect.top ?? 0,
      left: rect.left ?? 0,
      right: (rect.left ?? 0) + (rect.width ?? 100),
      bottom: (rect.top ?? 0) + (rect.height ?? 20),
      toJSON: () => ({}),
    }) as DOMRect;
}

describe("transcriptFollowScroll", () => {
  it("treats a row as centered inside inset viewport", () => {
    const container = document.createElement("div");
    const row = document.createElement("div");
    mockRect(container, { top: 200, height: 400 });
    mockRect(row, { top: 390, height: 20 });
    const insets: TranscriptFollowViewportInsets = { top: 80, bottom: 0 };
    expect(isTranscriptRowInFollowViewport(container, row, insets)).toBe(true);
  });

  it("scrolls container by delta to center row in inset viewport", () => {
    const container = document.createElement("div");
    const row = document.createElement("div");
    container.scrollTop = 100;
    container.scrollTo = ({ top }) => {
      container.scrollTop = top;
    };
    mockRect(container, { top: 200, height: 400 });
    mockRect(row, { top: 500, height: 20 });
    scrollTranscriptRowIntoFollowViewport(container, row, { top: 80, bottom: 0 }, "auto");
    expect(container.scrollTop).toBeGreaterThan(100);
  });

  it("uses mobile bias to keep active row in upper visible band", () => {
    const container = document.createElement("div");
    const row = document.createElement("div");
    container.scrollTop = 0;
    container.scrollTo = ({ top }) => {
      container.scrollTop = top;
    };
    mockRect(container, { top: 100, height: 400, bottom: 500 });
    mockRect(row, { top: 350, height: 20 });
    scrollTranscriptRowIntoFollowViewport(
      container,
      row,
      { top: 0, bottom: 88 },
      "auto",
      TRANSCRIPT_FOLLOW_MOBILE_VISIBLE_BIAS,
    );
    expect(container.scrollTop).toBeGreaterThan(0);
    expect(container.scrollTop).toBeLessThan(200);
  });

  it("reads inner follow insets with dock overlap", () => {
    vi.stubGlobal("innerHeight", 800);
    const root = document.createElement("div");
    root.style.setProperty("--artifact-mobile-dock-h", "96px");
    const container = document.createElement("div");
    root.appendChild(container);
    document.body.appendChild(root);
    mockRect(container, { top: 200, height: 620, bottom: 820 });

    const insets = readMobileTranscriptFollowInsets(container, "inner");
    expect(insets.top).toBe(0);
    expect(insets.bottom).toBeGreaterThan(0);

    document.body.removeChild(root);
    vi.unstubAllGlobals();
  });

  it("computes dock overlap from container extending under fixed dock", () => {
    vi.stubGlobal("innerHeight", 800);
    const root = document.createElement("div");
    root.style.setProperty("--artifact-mobile-dock-h", "100px");
    const container = document.createElement("div");
    root.appendChild(container);
    document.body.appendChild(root);
    mockRect(container, { top: 100, height: 750, bottom: 850 });

    expect(readMobileDockBottomInset(container)).toBe(150);

    document.body.removeChild(root);
    vi.unstubAllGlobals();
  });
});
