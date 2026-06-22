import { describe, expect, it } from "vitest";
import { morningReviewDateFromTags } from "@/lib/livingHope/morningEntryLinks";

describe("morningReviewDateFromTags", () => {
  it("reads review tag", () => {
    expect(morningReviewDateFromTags(["living-hope", "lh-review:2026-06-22"])).toBe("2026-06-22");
  });

  it("reads conversation tag", () => {
    expect(morningReviewDateFromTags(["lh-conversation:2026-06-22"])).toBe("2026-06-22");
  });

  it("returns null when absent", () => {
    expect(morningReviewDateFromTags(["journal"])).toBeNull();
  });
});
