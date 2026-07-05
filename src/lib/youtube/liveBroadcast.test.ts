import { describe, expect, it } from "vitest";
import { buildYouTubeEmbedSrc } from "@/lib/youtube/embed";
import {
  isYouTubeLiveUrl,
  metadataIndicatesLiveBroadcast,
  resolveLiveBroadcast,
} from "@/lib/youtube/liveBroadcast";

describe("isYouTubeLiveUrl", () => {
  it("detects youtube.com/live/{id} URLs", () => {
    expect(isYouTubeLiveUrl("https://www.youtube.com/live/abc123XYZ-_0")).toBe(true);
  });

  it("does not treat regular watch URLs as live", () => {
    expect(isYouTubeLiveUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
  });
});

describe("resolveLiveBroadcast", () => {
  it("uses metadata when the stored URL is canonical watch form", () => {
    expect(
      resolveLiveBroadcast("https://www.youtube.com/watch?v=abc123XYZ-_0", {
        live_broadcast: true,
      }),
    ).toBe(true);
  });

  it("detects live_capture workspace metadata", () => {
    expect(metadataIndicatesLiveBroadcast({ live_capture: { capture_mode: "operator_transcript_feed" } })).toBe(true);
  });
});

describe("buildYouTubeEmbedSrc liveEdge", () => {
  it("omits start param for live edge embeds", () => {
    const src = buildYouTubeEmbedSrc("dQw4w9WgXcQ", 120, { liveEdge: true });
    expect(src).not.toContain("start=");
  });

  it("includes start param for VOD embeds", () => {
    const src = buildYouTubeEmbedSrc("dQw4w9WgXcQ", 120);
    expect(src).toContain("start=120");
  });
});
