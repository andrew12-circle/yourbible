import { describe, expect, it } from "vitest";
import { parseHomeLayoutMedia, parseHomeMode } from "@/lib/profile/homeMedia";

describe("parseHomeMode", () => {
  it("defaults to ios when layout is empty", () => {
    expect(parseHomeMode(null)).toBe("ios");
    expect(parseHomeMode("")).toBe("ios");
    expect(parseHomeMode("{}")).toBe("ios");
  });

  it("returns hub when homeMode is hub", () => {
    expect(parseHomeMode(JSON.stringify({ homeMode: "hub" }))).toBe("hub");
  });

  it("falls back to ios for unknown values", () => {
    expect(parseHomeMode(JSON.stringify({ homeMode: "other" }))).toBe("ios");
  });
});

describe("parseHomeLayoutMedia", () => {
  it("parses homeMode from layout json", () => {
    const parsed = parseHomeLayoutMedia(JSON.stringify({ homeMode: "hub", homeWallpaperTint: 30 }));
    expect(parsed.homeMode).toBe("hub");
    expect(parsed.homeWallpaperTint).toBe(30);
  });
});
