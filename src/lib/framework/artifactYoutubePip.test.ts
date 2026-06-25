import { describe, expect, it } from "vitest";
import {
  clampArtifactPipLayout,
  defaultArtifactPipLayout,
  intersectionRatioForPipTarget,
  PIP_ENTER_CANCEL_RATIO,
  PIP_ENTER_VISIBLE_RATIO,
  PIP_EXIT_VISIBLE_RATIO,
  PIP_MIN_W,
  PIP_VIEWPORT_PAD,
  pipVisibilitySignal,
  shouldAllowPipEnter,
  shouldUseScrollRootForPipIo,
} from "./artifactYoutubePip";

describe("pipVisibilitySignal", () => {
  it("enters PIP only when mostly out of view", () => {
    expect(pipVisibilitySignal(false, 0)).toBe("enter");
    expect(pipVisibilitySignal(false, PIP_ENTER_VISIBLE_RATIO - 0.01)).toBe("enter");
    expect(pipVisibilitySignal(false, PIP_ENTER_VISIBLE_RATIO)).toBe("hold");
    expect(pipVisibilitySignal(false, PIP_ENTER_CANCEL_RATIO)).toBe("cancel_enter");
    expect(pipVisibilitySignal(false, 0.3)).toBe("cancel_enter");
  });

  it("exits PIP when hero anchor is sufficiently visible", () => {
    expect(pipVisibilitySignal(true, 1)).toBe("exit");
    expect(pipVisibilitySignal(true, PIP_EXIT_VISIBLE_RATIO + 0.01)).toBe("exit");
    expect(pipVisibilitySignal(true, PIP_EXIT_VISIBLE_RATIO)).toBe("exit");
    expect(pipVisibilitySignal(true, PIP_EXIT_VISIBLE_RATIO - 0.01)).toBe("cancel_exit");
  });

  it("holds hysteresis band while in PIP below exit threshold", () => {
    expect(pipVisibilitySignal(true, 0.15)).toBe("cancel_exit");
    expect(pipVisibilitySignal(false, 0.2)).toBe("hold");
  });
});

describe("shouldUseScrollRootForPipIo", () => {
  it("uses scroll root only when target is inside the lg split-pane scroller", () => {
    const scroll = document.createElement("div");
    const child = document.createElement("div");
    const outside = document.createElement("div");
    scroll.appendChild(child);
    document.body.append(scroll, outside);
    expect(shouldUseScrollRootForPipIo(scroll, child, true)).toBe(true);
    expect(shouldUseScrollRootForPipIo(scroll, outside, true)).toBe(false);
    expect(shouldUseScrollRootForPipIo(scroll, child, false)).toBe(false);
    scroll.remove();
    outside.remove();
  });
});

describe("shouldAllowPipEnter", () => {
  it("blocks enter until armed", () => {
    expect(shouldAllowPipEnter(false, "enter")).toBe(false);
    expect(shouldAllowPipEnter(true, "enter")).toBe(true);
    expect(shouldAllowPipEnter(true, "cancel_enter")).toBe(false);
  });
});

describe("intersectionRatioForPipTarget", () => {
  it("computes visible height fraction for viewport root", () => {
    const target = document.createElement("div");
    target.getBoundingClientRect = () =>
      ({
        top: 100,
        bottom: 400,
        left: 0,
        right: 100,
        width: 100,
        height: 300,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect;
    expect(intersectionRatioForPipTarget(target, null)).toBeCloseTo(1);
  });
});

describe("artifact pip layout", () => {
  it("defaults to top-right and clamps width to at least PIP_MIN_W", () => {
    const d = defaultArtifactPipLayout();
    expect(d.top).toBe(PIP_VIEWPORT_PAD);
    expect(d.width).toBeGreaterThanOrEqual(PIP_MIN_W);
    const clamped = clampArtifactPipLayout({ left: 8, top: 8, width: 120 });
    expect(clamped.width).toBeGreaterThanOrEqual(PIP_MIN_W);
  });
});
