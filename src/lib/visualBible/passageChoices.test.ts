import { describe, expect, it } from "vitest";
import type { BiblePlate } from "@/data/biblePlates/types";
import { PASSAGE_GEOGRAPHY, geographyForPlate, earthSceneUrl } from "@/data/visualBible/geography";
import { SEED_VISUALS } from "./seed";
import { passageVisualChoices } from "./passageChoices";
const plate: BiblePlate = { id: "entry", visualAssetId: "entry-art", bookAbbr: "Mat", chapter: 21, beforeVerse: 1, title: "Entry", referenceLabel: "Matthew 21", imageUrl: "/image.webp", alt: "Entry", kind: "artwork" };
const art = { ...SEED_VISUALS[0], id: "entry-art", title: "Entry", passages: [{ book: "Mat", chapter: 21, verse: 1, endVerse: 11, relationship: "depiction" as const, note: "Entry scene" }] };
describe("same-page visual choices", () => {
  it("keeps the current visual first, excludes unrelated scenes, and does not mutate the plate", () => {
    const before = JSON.stringify(plate);
    const other = { ...art, id: "later-scene", passages: [{ ...art.passages[0], verse: 12, endVerse: 17 }] };
    const map = { ...art, id: "context-map", kind: "map" as const, passages: [{ book: "Mat", chapter: 21, relationship: "geography" as const, note: "Broad map context" }] };
    expect(passageVisualChoices(plate, [other, map, art, art]).map(a => a.id)).toEqual(["entry-art", "context-map"]);
    expect(JSON.stringify(plate)).toBe(before);
  });
  it("does not promote an imprecise chapter-only painting to an exact event", () => {
    const broad = { ...art, id: "broad", passages: [{ book: "Mat", chapter: 21, relationship: "depiction" as const, note: "Chapter only" }] };
    expect(passageVisualChoices(plate, [art, broad])).toHaveLength(1);
  });
  it("preserves real legacy insertion positions when filtering the entry scene", () => {
    const early = { ...plate, id: "early", beforeVerse: 2 };
    const late = { ...plate, id: "late", beforeVerse: 20 };
    const record = { ...art, passages: [{ book: "Mat", chapter: 21, relationship: "depiction" as const, note: "Legacy chapter" }] };
    const ids = passageVisualChoices(plate, [art, { ...record, id: "plate-early" }, { ...record, id: "plate-late" }], [early, late]).map(a => a.id);
    expect(ids).toContain("plate-early"); expect(ids).not.toContain("plate-late");
  });
  it("offers geography only in the four declared entry passages and relevant chapter maps", () => {
    for (const p of PASSAGE_GEOGRAPHY[0].passages) expect(geographyForPlate(p.book, p.chapter, p.verse)?.id).toBe("triumphal-entry");
    expect(geographyForPlate("Luk", 19, 1, "artwork")).toBeUndefined();
    expect(geographyForPlate("Luk", 19, 1, "map")?.id).toBe("triumphal-entry");
    expect(geographyForPlate("Gen", 1, 1)).toBeUndefined();
    expect(earthSceneUrl(PASSAGE_GEOGRAPHY[0])).toMatch(/^https:\/\/earth.google.com\/web\/search\//);
    for (const point of PASSAGE_GEOGRAPHY[0].sites) { expect(Math.abs(point.lat)).toBeLessThanOrEqual(90); expect(Math.abs(point.lng)).toBeLessThanOrEqual(180); expect(point.precision).toBeTruthy(); expect(point.sourceUrl).toMatch(/^https:/); }
  });
});
