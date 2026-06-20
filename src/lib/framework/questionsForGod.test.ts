import { describe, expect, it } from "vitest";
import { formatQuestionDate, statusHint, statusLabel } from "./questionsForGod";

describe("questionsForGod", () => {
  it("maps status labels", () => {
    expect(statusLabel("waiting")).toBe("Waiting");
    expect(statusLabel("unknown")).toBe("May never know");
  });

  it("maps status hints", () => {
    expect(statusHint("released")).toContain("Let it go");
  });

  it("formats dates without throwing", () => {
    expect(formatQuestionDate("2026-06-20T12:00:00.000Z")).toMatch(/Jun/);
  });
});
