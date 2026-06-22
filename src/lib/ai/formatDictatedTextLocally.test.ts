import { describe, expect, it } from "vitest";
import { formatDictatedTextLocally } from "@/lib/ai/formatDictatedTextLocally";

describe("formatDictatedTextLocally", () => {
  it("capitalizes and adds terminal punctuation", () => {
    const raw = "give me patience and understanding";
    const out = formatDictatedTextLocally(raw);
    expect(out).toMatch(/^Give me patience/);
    expect(out).toMatch(/\.$/);
  });

  it("splits long runs at spoken pivots", () => {
    const raw =
      "give me the patience you understanding and wisdom to know what to do in this situation " +
      "and then help me trust you with the outcome because i am worried about money";
    const out = formatDictatedTextLocally(raw);
    expect(out).toContain("\n\n");
  });
});
