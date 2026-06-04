import { describe, expect, it } from "vitest";
import { sanitizeResearchChatContent } from "./sanitizeResearchChatContent";

describe("sanitizeResearchChatContent", () => {
  it("removes internal citation tokens", () => {
    const raw =
      "Hello [artifact:fbc9f758-0000-4000-8000-000000000001] and [journal:dfe83768-0000-4000-8000-000000000002] world.";
    expect(sanitizeResearchChatContent(raw)).toBe("Hello and world.");
  });
});
