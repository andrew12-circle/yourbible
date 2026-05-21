import { describe, expect, it } from "vitest";
import {
  isTranscriptRowInFollowViewport,
  scrollTranscriptRowIntoFollowViewport,
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
});
