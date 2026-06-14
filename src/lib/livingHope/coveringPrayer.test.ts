import { describe, expect, it } from "vitest";
import { DEFAULT_COVERING_PRAYER } from "@/lib/livingHope/coveringPrayer";

describe("coveringPrayer", () => {
  it("includes blood, armor, angels, and Psalm 91", () => {
    expect(DEFAULT_COVERING_PRAYER).toContain("blood of Jesus");
    expect(DEFAULT_COVERING_PRAYER).toContain("armor of God");
    expect(DEFAULT_COVERING_PRAYER).toContain("Angels of the Lord");
    expect(DEFAULT_COVERING_PRAYER).toContain("Psalm 91");
  });
});
