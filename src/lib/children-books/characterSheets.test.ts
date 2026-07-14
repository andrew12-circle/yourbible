import { describe, expect, it } from "vitest";
import { CHARACTER_BIBLES } from "@/lib/children-books/characterBibles";
import { listCharacterSheetJobs } from "@/lib/children-books/characterSheets";

describe("character bible model sheets", () => {
  it("lists turnaround, expressions, and outfits for every heroine", () => {
    const jobs = listCharacterSheetJobs();
    const characterCount = Object.keys(CHARACTER_BIBLES).length;
    const expectedKinds = Array.from({ length: characterCount }).flatMap(() => [
      "turnaround",
      "expressions",
      "outfits",
    ]);

    expect(jobs).toHaveLength(characterCount * 3);
    expect(jobs.every((j) => j.size === "1536x1024")).toBe(true);
    expect(jobs.map((j) => j.kind)).toEqual(expectedKinds);
    expect(jobs[0]!.prompt).toContain("LAYER 3 — CHARACTER BIBLE: LILLY");
    expect(jobs[0]!.prompt).toContain("TURNAROUND");
  });
});
