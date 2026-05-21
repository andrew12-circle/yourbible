import { describe, expect, it } from "vitest";
import { findActiveClaimId, getClaimSeekSeconds } from "./claimPlaybackSync";

describe("getClaimSeekSeconds", () => {
  it("prefers transcript segment time over chapter", () => {
    expect(
      getClaimSeekSeconds({ id: "a", chapter_start_seconds: 100 }, { startSeconds: 42 }),
    ).toBe(42);
  });

  it("falls back to chapter_start_seconds", () => {
    expect(getClaimSeekSeconds({ id: "a", chapter_start_seconds: 90 }, null)).toBe(90);
  });
});

describe("findActiveClaimId", () => {
  const claims = [
    { id: "c1", chapter_start_seconds: 10 },
    { id: "c2", chapter_start_seconds: 50 },
    { id: "c3", chapter_start_seconds: 120 },
    { id: "c4", chapter_start_seconds: null },
  ];
  const seek = (c: (typeof claims)[0]) => getClaimSeekSeconds(c, null);

  it("returns null before first anchored claim", () => {
    expect(findActiveClaimId(claims, seek, 5)).toBeNull();
  });

  it("returns latest claim at or before playback", () => {
    expect(findActiveClaimId(claims, seek, 10)).toBe("c1");
    expect(findActiveClaimId(claims, seek, 49)).toBe("c1");
    expect(findActiveClaimId(claims, seek, 50)).toBe("c2");
    expect(findActiveClaimId(claims, seek, 119)).toBe("c2");
    expect(findActiveClaimId(claims, seek, 200)).toBe("c3");
  });
});
