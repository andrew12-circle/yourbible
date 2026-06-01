import { describe, expect, it } from "vitest";
import { parseWebVttToTimedText } from "./youtubeInvidiousCaptions";

describe("parseWebVttToTimedText", () => {
  it("parses simple WebVTT cues", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello world

00:01:30.500 --> 00:01:33.000
Second line`;
    const out = parseWebVttToTimedText(vtt);
    expect(out).toContain("[0:01] Hello world");
    expect(out).toContain("[1:30] Second line");
  });
});
