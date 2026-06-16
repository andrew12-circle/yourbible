import { describe, expect, it } from "vitest";
import { parseHomeLayoutMedia, parseHomeMode } from "@/lib/profile/homeMedia";

describe("parseHomeMode", () => {
  it("defaults to hub when layout is empty", () => {
    expect(parseHomeMode(null)).toBe("hub");
    expect(parseHomeMode("")).toBe("hub");
    expect(parseHomeMode("{}")).toBe("hub");
  });

  it("returns hub when homeMode is hub", () => {
    expect(parseHomeMode(JSON.stringify({ homeMode: "hub" }))).toBe("hub");
  });

  it("returns ios when homeMode is ios", () => {
    expect(parseHomeMode(JSON.stringify({ homeMode: "ios" }))).toBe("ios");
  });

  it("falls back to hub for unknown values", () => {
    expect(parseHomeMode(JSON.stringify({ homeMode: "other" }))).toBe("hub");
  });
});

describe("parseHomeLayoutMedia", () => {
  it("parses homeMode from layout json", () => {
    const parsed = parseHomeLayoutMedia(JSON.stringify({ homeMode: "hub", homeWallpaperTint: 30 }));
    expect(parsed.homeMode).toBe("hub");
    expect(parsed.homeWallpaperTint).toBe(30);
  });
});
