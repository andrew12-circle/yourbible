import { describe, expect, it } from "vitest";
import {
  analyzeClientTimeoutSeconds,
  analyzeStaleSeconds,
  analyzeTimeoutMessage,
} from "./analyzeTimeouts";

describe("analyzeTimeouts", () => {
  it("extends stale retry and client timeout for long transcripts", () => {
    expect(analyzeStaleSeconds(10_000)).toBe(90);
    expect(analyzeStaleSeconds(50_000)).toBe(150);
    expect(analyzeStaleSeconds(104_599)).toBe(240);

    expect(analyzeClientTimeoutSeconds(10_000)).toBe(310);
    expect(analyzeClientTimeoutSeconds(104_599)).toBe(404);
    expect(analyzeClientTimeoutSeconds(500_000)).toBe(600);
  });

  it("mentions keep tab open in timeout message", () => {
    expect(analyzeTimeoutMessage(104_599)).toMatch(/Keep this tab open/i);
  });
});
