import { describe, expect, it } from "vitest";
import {
  buildLiveArtifactRawText,
  detectLiveClaimCandidates,
  parseLiveTranscriptInput,
} from "@/lib/framework/liveStream";

describe("live stream helpers", () => {
  it("parses timestamped transcript lines with speakers", () => {
    const chunks = parseLiveTranscriptInput("[10:42] Pastor: Faith without movement is dead.\nNext thought");

    expect(chunks).toMatchObject([
      {
        startSeconds: 642,
        speaker: "Pastor",
        text: "Faith without movement is dead.",
      },
      {
        startSeconds: 650,
        speaker: null,
        text: "Next thought",
      },
    ]);
  });

  it("detects lifted claims with theological and scripture signals", () => {
    const chunks = parseLiveTranscriptInput(
      [
        "[0:10] Fear blocks provision, but faith moves before it sees the answer.",
        "[0:24] Romans 12:2 shows that renewal is not optional; we must practice a new mindset.",
      ].join("\n"),
    );

    const claims = detectLiveClaimCandidates(chunks);

    expect(claims).toHaveLength(2);
    expect(claims[0].signals).toContain("emotional_intensity");
    expect(claims[0].signals).toContain("contradiction");
    expect(claims[1].linkedScriptures).toEqual(["Romans 12:2"]);
    expect(claims[1].signals).toContain("scripture_reference");
  });

  it("builds artifact raw text with normalized clocks", () => {
    const chunks = parseLiveTranscriptInput("[1:02:03] Speaker: God is calling us to pray.");

    expect(buildLiveArtifactRawText(chunks)).toBe("[1:02:03] Speaker: God is calling us to pray.");
  });
});
