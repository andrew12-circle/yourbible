import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { VISUAL_CATALOGUE } from "./catalogue";
import { explorerVisuals, explorerPlaces, parseSavedVisuals, savedVisualKey, placeIllustration, type ExplorerFilters } from "./explorerModel";
import { geographyAtlasSchema, googleEarthHref, googleMapsHref } from "@/lib/bible/geography";
const filter: ExplorerFilters = { section: "discover", query: "", collection: "all", creator: "", period: "", book: "Mat", chapter: 16, saved: [] };
const atlas = geographyAtlasSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "public/bible-geography/atlas-v1.json"), "utf8")));
describe("Unified visual explorer model", () => {
  it("keeps the current passage curated and prioritizes chapter-specific records", () => {
    const before = VISUAL_CATALOGUE.map(asset => asset.id);
    const result = explorerVisuals(VISUAL_CATALOGUE, filter);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].passages.some(p => p.book === "Mat" && p.chapter === 16 && (!p.endChapter || p.endChapter === 16))).toBe(true);
    expect(VISUAL_CATALOGUE.map(asset => asset.id)).toEqual(before);
    for (const asset of explorerVisuals(VISUAL_CATALOGUE, { ...filter, section: "art" })) expect(asset.kind).toBe("artwork");
    expect(explorerVisuals(VISUAL_CATALOGUE, { ...filter, query: "nonesuch-foobar-unique" })).toEqual([]);
  });
  it("uses actual Matthew 16 geography and validated coordinate links", () => {
    const places = explorerPlaces(atlas.places, "", "Mat", 16, "csb");
    const caesarea = places.find(place => place.name === "Caesarea Philippi")!;
    expect(caesarea).toBeTruthy();
    expect(googleEarthHref(caesarea.candidates[0])).toBe("https://earth.google.com/web/search/33.246111%2C35.693333");
    expect(new URL(googleMapsHref(caesarea.candidates[0])).searchParams.get("query")).toBe("33.246111,35.693333");
    expect(placeIllustration(caesarea, VISUAL_CATALOGUE)?.title).toContain("Caesarea Philippi");
  });
  it("accepts Scripture searches and never substitutes an unsupported canon", () => {
    expect(explorerPlaces(atlas.places, "Matthew 16:13", undefined, undefined, "csb").some(place => place.name === "Caesarea Philippi")).toBe(true);
    expect(explorerPlaces(atlas.places, "Matthew 99", undefined, undefined, "csb")).toEqual([]);
    expect(explorerPlaces(atlas.places, "", "Enoch", 1, "all")).toEqual([]);
    expect(explorerPlaces(atlas.places, "Rome", "Mat", 16, "csb")).toEqual([]);
  });
  it("keeps saved IDs typed, private to the owner key, deduplicated and bounded", () => {
    expect(savedVisualKey("owner1")).not.toBe(savedVisualKey("owner2"));
    expect(savedVisualKey()).not.toBe(savedVisualKey("owner1"));
    expect(parseSavedVisuals('{"wrong":true}')).toEqual([]);
    expect(parseSavedVisuals('invalid')).toEqual([]);
    expect(parseSavedVisuals('["visual:abc", "place:a123456", "visual:abc", 2, "bad"]')).toEqual(["visual:abc", "place:a123456"]);
    expect(parseSavedVisuals(JSON.stringify(Array.from({ length: 2050 }, (_, i) => `visual:a${i}`)))).toHaveLength(2000);
    const one = explorerVisuals(VISUAL_CATALOGUE, filter)[0];
    expect(explorerVisuals(VISUAL_CATALOGUE, { ...filter, section: "saved", saved: [`visual:${one.id}`] })).toEqual([one]);
  });
});
