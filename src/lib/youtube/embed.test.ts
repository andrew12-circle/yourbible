import { describe, expect, it } from "vitest";
import { buildYouTubeEmbedSrc } from "./embed";

describe("buildYouTubeEmbedSrc", () => {
  it("builds a standard embed URL with controls", () => {
    const url = buildYouTubeEmbedSrc("dQw4w9WgXcQ");
    expect(url).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(url).toContain("controls=1");
    expect(url).toContain("enablejsapi=1");
    expect(url).toContain("playsinline=1");
    expect(url).not.toContain("start=");
  });

  it("includes start seconds when provided", () => {
    const url = buildYouTubeEmbedSrc("dQw4w9WgXcQ", 42);
    expect(url).toContain("start=42");
  });

  it("supports autoplay option", () => {
    const url = buildYouTubeEmbedSrc("dQw4w9WgXcQ", 0, { autoplay: true });
    expect(url).toContain("autoplay=1");
  });

  it("includes widget_referrer when provided", () => {
    const url = buildYouTubeEmbedSrc("dQw4w9WgXcQ", 0, {
      widgetReferrer: "https://example.com/artifacts/1",
    });
    expect(url).toContain("widget_referrer=");
    expect(url).toContain(encodeURIComponent("https://example.com/artifacts/1"));
  });
});
