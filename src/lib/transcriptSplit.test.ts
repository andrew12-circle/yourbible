import { describe, expect, it } from "vitest";
import { splitTranscript } from "./transcriptSplit";

describe("splitTranscript", () => {
  it("parses bracket lines with startSeconds for follow-playback", () => {
    const raw = "[0:22] Hello\n[1:59] Near two minutes";
    const { segments, timed } = splitTranscript(raw);
    expect(timed).toBe(true);
    expect(segments.filter((s) => s.startSeconds != null).map((s) => s.startSeconds)).toEqual([22, 119]);
  });

  it("normalizes and parses mashed YouTube cues after 1:59", () => {
    const raw = "[1:59] Earlier line\n2:032 minutes, 3 secondsYou ride them hard";
    const { segments, timed } = splitTranscript(raw);
    expect(timed).toBe(true);
    const timedRows = segments.filter((s) => !s.isParagraphBreak && s.startSeconds != null);
    expect(timedRows.map((s) => s.startSeconds)).toEqual([119, 123]);
    expect(timedRows[1]?.text).toBe("You ride them hard");
  });

  it("assigns startSeconds for standalone mashed line blob", () => {
    const raw = "2:092 minutes, 9 secondsMore text here";
    const { segments, timed } = splitTranscript(raw);
    expect(timed).toBe(true);
    expect(segments[0]?.startSeconds).toBe(129);
    expect(segments[0]?.text).toBe("More text here");
  });
});
