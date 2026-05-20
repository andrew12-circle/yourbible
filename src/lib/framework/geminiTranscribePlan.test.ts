import { describe, expect, it } from "vitest";
import {
  parseIso8601Duration,
  planGeminiTranscribeSegments,
} from "../../../supabase/functions/_shared/youtubeGeminiTranscribe.ts";

const CFG = {
  maxSingleRequestSeconds: 45 * 60,
  maxDurationSeconds: 3 * 60 * 60,
  segmentSeconds: 20 * 60,
};

describe("parseIso8601Duration", () => {
  it("parses hours, minutes, seconds", () => {
    expect(parseIso8601Duration("PT2H51M36S")).toBe(2 * 3600 + 51 * 60 + 36);
  });
});

describe("planGeminiTranscribeSegments", () => {
  it("single window with offsets for short known videos", () => {
    const plan = planGeminiTranscribeSegments(30 * 60, CFG);
    expect(plan.durationKnown).toBe(true);
    expect(plan.segments).toEqual([{ start: 0, end: 30 * 60 }]);
  });

  it("chunks ~3h videos into 20-minute segments", () => {
    const total = 2 * 3600 + 51 * 60 + 36;
    const plan = planGeminiTranscribeSegments(total, CFG);
    expect(plan.segments.length).toBe(9);
    expect(plan.segments[0]).toEqual({ start: 0, end: 20 * 60 });
    expect(plan.segments[8]!.end).toBe(total);
  });

  it("chunks unknown duration up to max (never single full-video shot)", () => {
    const plan = planGeminiTranscribeSegments(undefined, CFG);
    expect(plan.durationKnown).toBe(false);
    expect(plan.segments.length).toBeGreaterThan(1);
    expect(plan.segments[0]).toEqual({ start: 0, end: 20 * 60 });
  });
});
