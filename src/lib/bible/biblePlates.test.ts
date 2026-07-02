import { describe, expect, it } from "vitest";
import {
  chapterContext,
  hasChapterMedia,
  inlinePlatesForChapter,
  mapsForChapter,
  openingPlatesForChapter,
  platesBeforeVerse,
  platesForChapter,
} from "./biblePlates";

describe("biblePlates", () => {
  it("returns chapter plates sorted by beforeVerse", () => {
    const plates = platesForChapter("Gen", 22);
    expect(plates.length).toBeGreaterThan(0);
    expect(plates[0]?.beforeVerse).toBe(1);
  });

  it("finds opening plates at verse 1", () => {
    expect(openingPlatesForChapter("Gen", 1).length).toBeGreaterThan(0);
    expect(openingPlatesForChapter("Psa", 1)).toHaveLength(0);
  });

  it("dedupes inline plates to one per verse slot by priority", () => {
    // Matthew 5:1 has two plates at the same slot (Tissot + Doré Sermon on the Mount).
    const all = platesForChapter("Mat", 5);
    const inline = inlinePlatesForChapter("Mat", 5);
    expect(all.length).toBeGreaterThan(inline.length);
    expect(inline.filter((p) => p.beforeVerse === 1)).toHaveLength(1);
  });

  it("finds mid-chapter plates", () => {
    expect(platesBeforeVerse("2Sa", 23, 15)[0]?.title).toContain("Bethlehem");
  });

  it("builds chapter context with maps for exodus", () => {
    const ctx = chapterContext("Exo", 14);
    expect(ctx.plates.length).toBeGreaterThan(0);
    expect(ctx.mapIds).toContain("exodus");
    expect(hasChapterMedia("Exo", 14)).toBe(true);
  });

  it("includes full-color Tissot plates that beat Doré inline at the same verse", () => {
    const inline = inlinePlatesForChapter("Mat", 5);
    const tissot = inline.find((p) => p.artist === "James Tissot");
    expect(tissot).toBeDefined();
    expect(tissot?.priority ?? 10).toBeLessThan(10);
  });

  it("links maps for genesis patriarchs", () => {
    expect(mapsForChapter("Gen", 22).map((m) => m.id)).toContain("abraham");
  });
});
