import { describe, expect, it } from "vitest";
import { filterSubstantiveClaims, isMetaOrLowValueClaim } from "@/lib/framework/claimQuality";

describe("isMetaOrLowValueClaim", () => {
  it("flags episode/video meta summaries", () => {
    expect(isMetaOrLowValueClaim("The episode covers a lot of topics.")).toBe(true);
    expect(
      isMetaOrLowValueClaim(
        "The video content is designed to build cumulatively, with later sections relying on understanding earlier ones.",
      ),
    ).toBe(true);
    expect(isMetaOrLowValueClaim("The episode discusses altars.")).toBe(true);
  });

  it("keeps substantive theological claims", () => {
    expect(isMetaOrLowValueClaim("God, in His genius, intentionally places power in the world of spirit.")).toBe(
      false,
    );
    expect(
      isMetaOrLowValueClaim(
        "Dominion is achieved when an individual possesses the knowledge that demons are afraid of them.",
      ),
    ).toBe(false);
  });
});

describe("filterSubstantiveClaims", () => {
  it("drops meta claims when substantive ones exist", () => {
    const input = [
      { id: "1", claim: "The episode covers a lot of topics." },
      { id: "2", claim: "God identifies the interface as an altar." },
    ];
    expect(filterSubstantiveClaims(input)).toEqual([{ id: "2", claim: "God identifies the interface as an altar." }]);
  });
});
