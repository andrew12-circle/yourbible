import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import {
  estimateUntimedPartSeekSeconds,
  findActiveClaimId,
  getClaimSeekSeconds,
} from "./claimPlaybackSync";

const untimedParts: TranscriptSegment[] = Array.from({ length: 4 }, (_, i) => ({
  id: `transcript-${i}`,
  label: `Part ${i + 1}`,
  text: `Chunk ${i + 1}`,
  startSeconds: null,
}));

describe("estimateUntimedPartSeekSeconds", () => {
  it("maps part index across video duration", () => {
    expect(
      estimateUntimedPartSeekSeconds(
        { label: "Part 2", startSeconds: null },
        untimedParts,
        600,
      ),
    ).toBe(200);
    expect(
      estimateUntimedPartSeekSeconds(
        { label: "Part 4", startSeconds: null },
        untimedParts,
        600,
      ),
    ).toBe(599);
  });
});

describe("getClaimSeekSeconds", () => {
  it("prefers transcript segment time over chapter", () => {
    expect(
      getClaimSeekSeconds({ id: "a", chapter_start_seconds: 100 }, { startSeconds: 42 }),
    ).toBe(42);
  });

  it("falls back to chapter_start_seconds", () => {
    expect(getClaimSeekSeconds({ id: "a", chapter_start_seconds: 90 }, null)).toBe(90);
  });

  it("estimates seek time for untimed Part labels when duration is known", () => {
    expect(
      getClaimSeekSeconds(
        { id: "a", chapter_start_seconds: null },
        { label: "Part 3", startSeconds: null },
        { transcriptSegments: untimedParts, videoDurationSeconds: 900 },
      ),
    ).toBe(600);
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
