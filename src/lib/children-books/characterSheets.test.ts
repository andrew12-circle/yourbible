import { describe, expect, it } from "vitest";
import { listCharacterSheetJobs } from "@/lib/children-books/characterSheets";

describe("character bible model sheets", () => {
  it("lists turnaround, expressions, and outfits for every heroine", () => {
    const jobs = listCharacterSheetJobs();
    expect(jobs).toHaveLength(12);
    expect(jobs.every((j) => j.size === "1536x1024")).toBe(true);
    expect(jobs.map((j) => j.kind)).toEqual([
      "turnaround",
      "expressions",
      "outfits",
      "turnaround",
      "expressions",
      "outfits",
      "turnaround",
      "expressions",
      "outfits",
      "turnaround",
      "expressions",
      "outfits",
    ]);
    expect(jobs[0]!.prompt).toContain("LAYER 3 — CHARACTER BIBLE: LILLY");
    expect(jobs[0]!.prompt).toContain("TURNAROUND");
  });
});
