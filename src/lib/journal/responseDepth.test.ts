import { describe, expect, it } from "vitest";
import { detectAutoResponseDepth, resolveResponseDepth } from "./responseDepth";

describe("detectAutoResponseDepth", () => {
  it("classifies faith/struggle why questions as deep", () => {
    const msg =
      "I feel inept. I asked God for wisdom and I am following what I am supposed to be doing through GOD, " +
      "but why does things not workout in real time? If I were to ask God before I do something every time would it happen at all?";
    expect(detectAutoResponseDepth(msg)).toBe("deep");
  });

  it("keeps short mood check-ins as reflect", () => {
    expect(detectAutoResponseDepth("Heavy day. Just tired.")).toBe("reflect");
  });

  it("reflects for neutral journaling", () => {
    expect(detectAutoResponseDepth("Went for a walk. Coffee was good.")).toBe("reflect");
  });
});

describe("resolveResponseDepth", () => {
  it("honors manual reflect override", () => {
    const msg = "Why does God allow suffering when I obey?";
    expect(resolveResponseDepth("reflect", msg)).toBe("reflect");
  });

  it("honors manual deep override", () => {
    expect(resolveResponseDepth("deep", "Heavy day.")).toBe("deep");
  });

  it("auto-detects when setting is auto", () => {
    const msg = "Why if I am following God does nothing work out in real time?";
    expect(resolveResponseDepth("auto", msg)).toBe("deep");
  });
});
