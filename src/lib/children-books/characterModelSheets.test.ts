import { describe, expect, it } from "vitest";
import {
  buildMasterModelSheetPrompt,
  CORE_CAST,
  getModelCharacter,
  listMasterModelSheetJobs,
} from "@/lib/children-books/characterModelSheets";

describe("Character Model Creation System", () => {
  it("includes the full permanent core cast (Lilly + family)", () => {
    expect(CORE_CAST.map((c) => c.id)).toEqual(["lilly", "tish", "andrew", "winston"]);
    expect(getModelCharacter("lilly")?.kind).toBe("child");
    expect(getModelCharacter("winston")?.kind).toBe("animal");
    expect(getModelCharacter("nobody")).toBeUndefined();
  });

  it("lists one master model-sheet job per character with a landscape sheet path", () => {
    const jobs = listMasterModelSheetJobs();
    expect(jobs.map((j) => j.characterId)).toEqual(["lilly", "tish", "andrew", "winston"]);
    for (const job of jobs) {
      expect(job.relativePath).toBe(`children-books/character-bibles/${job.characterId}/model-sheet.png`);
      expect(job.size).toBe("1536x1024");
      expect(job.styleVersion).toBe("v3");
    }
  });

  it("filters jobs by id and honors a studio style version override", () => {
    const only = listMasterModelSheetJobs(["winston"]);
    expect(only).toHaveLength(1);
    expect(only[0]!.characterId).toBe("winston");

    const v1 = listMasterModelSheetJobs(["lilly"], "v1");
    expect(v1[0]!.styleVersion).toBe("v1");
    expect(v1[0]!.prompt).toContain("studioStyle_v1");
  });

  it("frames the sheet as a permanent model reference, not a story page", () => {
    const lilly = buildMasterModelSheetPrompt(getModelCharacter("lilly")!);
    expect(lilly).toContain("CHARACTER MODEL CREATION SYSTEM");
    expect(lilly).toContain("CONSISTENCY RULES");
    expect(lilly).toContain("CHARACTER TO MODEL: Lilly");
    expect(lilly).toContain("MASTER MODEL SHEET LAYOUT");
    expect(lilly).toContain("No text, letters, labels");
    // person layout has a turnaround + expression studies
    expect(lilly).toContain("front, three-quarter, side profile, and back view");
    expect(lilly).toContain("expression studies");
  });

  it("uses an animal layout for Winston and a person layout for adults", () => {
    const winston = buildMasterModelSheetPrompt(getModelCharacter("winston")!);
    expect(winston).toContain("CHARACTER TO MODEL: Winston");
    expect(winston).toContain("Airedale Terrier");
    expect(winston).toContain("sitting, standing, play bow, and walking");
    expect(winston).not.toContain("expression studies");

    const andrew = buildMasterModelSheetPrompt(getModelCharacter("andrew")!);
    expect(andrew).toContain("front, three-quarter, side profile, and back view");
    expect(andrew).toContain("canonical outfit variations");
  });
});
