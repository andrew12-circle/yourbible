import { describe, expect, it } from "vitest";
import { sanitizeResearchChatContent } from "./sanitizeResearchChatContent";

describe("sanitizeResearchChatContent", () => {
  it("removes internal citation tokens", () => {
    const raw =
      "Hello [artifact:fbc9f758-0000-4000-8000-000000000001] and [journal:dfe83768-0000-4000-8000-000000000002] world.";
    expect(sanitizeResearchChatContent(raw)).toBe("Hello and world.");
  });

  it("removes double-bracket citation tokens", () => {
    const raw = "See [[journal:798b717b-63c9-4070-b929-bb50144021]] for context.";
    expect(sanitizeResearchChatContent(raw)).toBe("See for context.");
  });
});
