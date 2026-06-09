import { describe, expect, it } from "vitest";
import { claimResearchEntryTag } from "@/lib/journal/claimResearchChatSession";

describe("claimResearchEntryTag", () => {
  it("returns a stable tag per claim id", () => {
    const claimId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(claimResearchEntryTag(claimId)).toBe(`claim-research:${claimId}`);
  });
});
