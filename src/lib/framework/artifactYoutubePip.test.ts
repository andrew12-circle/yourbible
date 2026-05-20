import { describe, expect, it } from "vitest";
import {
  PIP_ENTER_VISIBLE_RATIO,
  PIP_EXIT_VISIBLE_RATIO,
  pipVisibilitySignal,
} from "./artifactYoutubePip";

describe("pipVisibilitySignal", () => {
  it("enters PIP only when mostly out of view", () => {
    expect(pipVisibilitySignal(false, 0)).toBe("enter");
    expect(pipVisibilitySignal(false, PIP_ENTER_VISIBLE_RATIO - 0.01)).toBe("enter");
    expect(pipVisibilitySignal(false, PIP_ENTER_VISIBLE_RATIO)).toBe("cancel_enter");
    expect(pipVisibilitySignal(false, 0.3)).toBe("cancel_enter");
  });

  it("exits PIP only when mostly in view", () => {
    expect(pipVisibilitySignal(true, 1)).toBe("exit");
    expect(pipVisibilitySignal(true, PIP_EXIT_VISIBLE_RATIO + 0.01)).toBe("exit");
    expect(pipVisibilitySignal(true, PIP_EXIT_VISIBLE_RATIO)).toBe("cancel_exit");
    expect(pipVisibilitySignal(true, 0.3)).toBe("cancel_exit");
  });

  it("holds hysteresis band while in PIP", () => {
    expect(pipVisibilitySignal(true, 0.2)).toBe("cancel_exit");
    expect(pipVisibilitySignal(false, 0.2)).toBe("cancel_enter");
  });
});
