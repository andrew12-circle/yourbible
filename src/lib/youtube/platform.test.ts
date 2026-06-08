import { describe, expect, it, vi } from "vitest";
import { isIpadWebKit, isIphoneWebKit } from "./platform";

describe("youtube platform", () => {
  it("detects iPhone user agent", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    vi.stubGlobal("window", { screen: { width: 393, height: 852 } });
    expect(isIphoneWebKit()).toBe(true);
    expect(isIpadWebKit()).toBe(false);
  });

  it("detects iPad user agent", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
      platform: "iPad",
      maxTouchPoints: 5,
    });
    vi.stubGlobal("window", { screen: { width: 820, height: 1180 } });
    expect(isIphoneWebKit()).toBe(false);
    expect(isIpadWebKit()).toBe(true);
  });
});
