import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { estimateUntimedPartSeekSeconds, findActiveClaimId, getClaimSeekSeconds } from "./claimPlaybackSync";
const untimedParts: TranscriptSegment[] = Array.from({ length: 4 }, (_, i) => ({ id: `transcript-${i}`, label: `Part ${i + 1}`, text: `Chunk ${i + 1}`, startSeconds: null }));

describe("finding playback timing", () => {
  it("does not invent a timestamp from paragraph index and duration", () => {
    expect(estimateUntimedPartSeekSeconds({ label: "Part 2", startSeconds: null }, untimedParts, 600)).toBeNull();
    expect(getClaimSeekSeconds({ id: "a" }, { label: "Part 3", startSeconds: null }, { transcriptSegments: untimedParts, videoDurationSeconds: 900 })).toBeNull();
  });
  it("prefers a real source timestamp over a coarse chapter", () => {
    expect(getClaimSeekSeconds({ id: "a", chapter_start_seconds: 100 }, { startSeconds: 42 })).toBe(42);
  });
  it("retains legacy chapter navigation without pretending it is an exact quotation", () => {
    expect(getClaimSeekSeconds({ id: "a", chapter_start_seconds: 90 }, null)).toBe(90);
  });
  it("does not substitute an unrelated chapter for a versioned finding with missing evidence", () => {
    expect(getClaimSeekSeconds({ id: "a", chapter_start_seconds: 90, source_evidence: { quote: "old quotation" } }, null)).toBeNull();
  });
  it("does not present estimated word timing as precise", () => {
    expect(getClaimSeekSeconds({ id: "a" }, { startSeconds: 42, timestampEstimated: true })).toBeNull();
  });
});
describe("findActiveClaimId", () => {
  const claims = [{ id: "c1", chapter_start_seconds: 10 }, { id: "c2", chapter_start_seconds: 50 }, { id: "c3", chapter_start_seconds: 120 }, { id: "c4", chapter_start_seconds: null }];
  const seek = (claim: (typeof claims)[0]) => getClaimSeekSeconds(claim, null);
  it("returns null before first anchored claim", () => { expect(findActiveClaimId(claims, seek, 5)).toBeNull(); });
  it("returns latest claim at or before playback", () => {
    expect(findActiveClaimId(claims, seek, 10)).toBe("c1");
    expect(findActiveClaimId(claims, seek, 49)).toBe("c1");
    expect(findActiveClaimId(claims, seek, 50)).toBe("c2");
    expect(findActiveClaimId(claims, seek, 119)).toBe("c2");
    expect(findActiveClaimId(claims, seek, 200)).toBe("c3");
  });
});
