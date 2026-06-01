import { describe, expect, it } from "vitest";
import { transcriptPlusToTimedText } from "./transcriptPlusFormat";

describe("transcriptPlusToTimedText", () => {
  it("formats offset segments", () => {
    const out = transcriptPlusToTimedText([
      { offset: 65, text: "hello" },
      { offset: 3665, text: "world" },
    ]);
    expect(out).toBe("[1:05] hello\n[1:01:05] world");
  });
});
