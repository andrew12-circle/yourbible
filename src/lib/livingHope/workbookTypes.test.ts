import { describe, expect, it } from "vitest";
import { mergeWorkbook, weekStartISO } from "@/lib/livingHope/workbookTypes";

describe("workbookTypes", () => {
  it("mergeWorkbook applies defaults", () => {
    const wb = mergeWorkbook(null);
    expect(wb.weekly_questions.length).toBe(5);
    expect(wb.vision_tagline).toBe("Not fantasy. Structure.");
  });

  it("weekStartISO returns Monday", () => {
    const mon = weekStartISO(new Date("2026-06-10")); // Wednesday
    expect(mon).toBe("2026-06-08");
  });
});
