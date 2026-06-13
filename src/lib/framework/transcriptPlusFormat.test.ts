import { describe, expect, it } from "vitest";
import { mergeTranscriptPlusSegments, transcriptPlusToTimedText } from "./transcriptPlusFormat";

describe("mergeTranscriptPlusSegments", () => {
  it("merges short cues into thicker lines", () => {
    const merged = mergeTranscriptPlusSegments([
      { offset: 0, duration: 2, text: "hello there" },
      { offset: 2, duration: 2, text: "how are you" },
      { offset: 4, duration: 2, text: "doing today friend" },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.text).toBe("hello there how are you doing today friend");
  });

  it("decodes html entities", () => {
    const merged = mergeTranscriptPlusSegments([{ offset: 1, duration: 1, text: "I didn&#39;t know" }]);
    expect(merged[0]?.text).toBe("I didn't know");
  });
});

describe("transcriptPlusToTimedText", () => {
  it("formats offset segments", () => {
    const out = transcriptPlusToTimedText([
      { offset: 65, text: "hello" },
      { offset: 3665, text: "world" },
    ]);
    expect(out).toBe("[1:05] hello\n[1:01:05] world");
  });
});
