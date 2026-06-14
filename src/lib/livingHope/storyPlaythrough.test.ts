import { describe, expect, it } from "vitest";
import {
  composeStoryPlaythrough,
  emptyStoryPlaythroughResponses,
  parseStoryPlaythrough,
} from "@/lib/livingHope/storyPlaythrough";

describe("storyPlaythrough", () => {
  it("composes and parses round-trip", () => {
    const responses = {
      ...emptyStoryPlaythroughResponses(),
      enter: "I'm in the kitchen.",
      senses: "Warm light, coffee smell.",
      live: "I give thanks before the day starts.",
    };
    const raw = composeStoryPlaythrough("Tithing $100k months casually.", responses);
    const parsed = parseStoryPlaythrough(raw);
    expect(parsed.enter).toBe("I'm in the kitchen.");
    expect(parsed.senses).toBe("Warm light, coffee smell.");
    expect(parsed.live).toBe("I give thanks before the day starts.");
  });

  it("returns empty responses for blank input", () => {
    expect(parseStoryPlaythrough("")).toEqual(emptyStoryPlaythroughResponses());
  });
});
