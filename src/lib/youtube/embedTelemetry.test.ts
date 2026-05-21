import { describe, expect, it } from "vitest";
import { currentTimeFromEmbedInfo, embedStateIsPlaying, YT_EMBED_STATE } from "./embedTelemetry";

describe("currentTimeFromEmbedInfo", () => {
  it("reads currentTime from infoDelivery payload", () => {
    expect(currentTimeFromEmbedInfo({ currentTime: 8172.4 })).toBe(8172.4);
  });

  it("reads currentTime from getVideoData payload", () => {
    expect(currentTimeFromEmbedInfo({ videoData: { currentTime: 8289.1 } })).toBe(8289.1);
  });

  it("prefers top-level currentTime when both are present", () => {
    expect(
      currentTimeFromEmbedInfo({ currentTime: 100, videoData: { currentTime: 200 } }),
    ).toBe(100);
  });
});

describe("embedStateIsPlaying", () => {
  it("treats buffering as playing", () => {
    expect(embedStateIsPlaying(YT_EMBED_STATE.BUFFERING)).toBe(true);
    expect(embedStateIsPlaying(YT_EMBED_STATE.PLAYING)).toBe(true);
    expect(embedStateIsPlaying(YT_EMBED_STATE.PAUSED)).toBe(false);
  });
});
