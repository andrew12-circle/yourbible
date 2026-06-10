import { describe, expect, it } from "vitest";
import { openingPlatesForChapter, platesBeforeVerse, platesForChapter } from "./biblePlates";

describe("biblePlates", () => {
  it("returns chapter plates sorted by beforeVerse", () => {
    const plates = platesForChapter("2Sa", 23);
    expect(plates.length).toBeGreaterThan(0);
    expect(plates[0]?.beforeVerse).toBe(15);
  });

  it("finds opening plates at verse 1", () => {
    expect(openingPlatesForChapter("Gen", 1)).toHaveLength(1);
    expect(openingPlatesForChapter("Psa", 1)).toHaveLength(0);
  });

  it("finds mid-chapter plates", () => {
    expect(platesBeforeVerse("2Sa", 23, 15)[0]?.title).toContain("Bethlehem");
  });
});
