import { describe, expect, it } from "vitest";
import {
  artifactHasStudyableTranscript,
  isArtifactRateLimitError,
  isNonBlockingAnalysisError,
  shouldRepairRateLimitArtifact,
} from "./artifactAnalysisRecovery";

describe("artifactAnalysisRecovery", () => {
  it("detects rate limit errors", () => {
    expect(isArtifactRateLimitError("Rate limited — wait 2 minutes")).toBe(true);
    expect(isArtifactRateLimitError("Claim extraction hit an AI provider limit")).toBe(true);
    expect(isArtifactRateLimitError("Could not fetch transcript")).toBe(false);
  });

  it("repairs error status when a long transcript exists", () => {
    const raw = "x".repeat(3000);
    expect(
      shouldRepairRateLimitArtifact({
        status: "error",
        error: "Rate limited — try Re-analyze in a minute.",
        rawText: raw,
      }),
    ).toBe(true);
    expect(
      shouldRepairRateLimitArtifact({
        status: "ready",
        error: "Rate limited",
        rawText: raw,
      }),
    ).toBe(false);
  });

  it("treats rate limit as non-blocking when claims or transcript exist", () => {
    expect(
      isNonBlockingAnalysisError({
        error: "Rate limited",
        rawText: "short",
        claimsCount: 3,
      }),
    ).toBe(true);
    expect(
      isNonBlockingAnalysisError({
        error: "Rate limited",
        rawText: "x".repeat(5000),
        claimsCount: 0,
      }),
    ).toBe(true);
    expect(
      isNonBlockingAnalysisError({
        error: "Rate limited",
        rawText: "tiny",
        claimsCount: 0,
      }),
    ).toBe(false);
  });

  it("requires minimum transcript length for studyable content", () => {
    expect(artifactHasStudyableTranscript("x".repeat(1999))).toBe(false);
    expect(artifactHasStudyableTranscript("x".repeat(2000))).toBe(true);
  });
});
