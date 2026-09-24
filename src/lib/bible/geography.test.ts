import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BOOKS } from "@/data/books";
import { filterGeographyPlaces, geographyAtlasSchema, geographyBookNumber, geographyPrecisionLabel, geographyReferences, geographyStatus, geographyTranslation, googleEarthHref, googleMapsHref, googleStreetViewHref, parseGeographyVerseRange, type GeographyFilter, type GeographyPlace, type GeographyCandidate } from "./geography";
import { geographyKml } from "./geographyKml";

const candidate: GeographyCandidate = { id: "a123456-0-0", modernId: "m123456", name: "Site A", description: "A proposed site", lon: 35.2, lat: 31.7, coordinateKind: "point", score: 350, radiusMeters: null, geometryId: null };
const place: GeographyPlace = { id: "a123456", name: "A & B", aliases: ["Béthel"], type: "settlement", sourceUrl: "https://www.openbible.info/geo/ancient/a123456/test", notes: "", geojsonFile: null, candidates: [candidate], unresolved: [], references: [{ b: 44, c: 4, v: 5, t: 5, a: { kjv: [44, 4, 6] } }] };
const all: GeographyFilter = { book: null, chapter: null, verses: null, translation: "all", query: "" };

describe("Bible geography", () => {
  it("matches canonical reader abbreviations and refuses unknown books", () => {
    expect(geographyBookNumber("Exo")).toBe(2);
    expect(geographyBookNumber("1 John")).toBe(62);
    expect(geographyBookNumber("Enoch")).toBeNull();
    expect(geographyTranslation("CSB Study Bible")).toBe("csb");
    expect(geographyTranslation("Amharic")).toBe("all");
  });
  it("keeps translation-only mentions and alternate versification separate", () => {
    expect(geographyReferences(place, "csb")).toEqual([{ b: 44, c: 4, v: 5 }]);
    expect(geographyReferences(place, "kjv")).toEqual([{ b: 44, c: 4, v: 6 }]);
    expect(geographyReferences(place, "esv")).toEqual([]);
    expect(filterGeographyPlaces([place], { ...all, book: 44, chapter: 4, verses: [5, 5], translation: "kjv" })).toEqual([]);
    expect(filterGeographyPlaces([place], { ...all, book: 44, chapter: 4, verses: [6, 6], translation: "kjv" })).toEqual([place]);
  });
  it("searches aliases without collapsing distinct ancient identities", () => {
    expect(filterGeographyPlaces([place, { ...place, id: "a234567" }], { ...all, query: "bethel" })).toHaveLength(2);
    expect(filterGeographyPlaces([place], { ...all, query: "Site A" })).toHaveLength(1);
    expect(filterGeographyPlaces([place], { ...all, book: 43 })).toHaveLength(0);
  });
  it("validates verse ranges rather than silently widening an invalid filter", () => {
    expect(parseGeographyVerseRange("7–12")).toEqual([7, 12]);
    expect(parseGeographyVerseRange(" 7 ")).toEqual([7, 7]);
    expect(parseGeographyVerseRange("")).toBeNull();
    for (const value of ["0", "12-3", "2,4", "177", "no"]) expect(() => parseGeographyVerseRange(value)).toThrow();
  });
  it("uses lat/lon for Google URLs and rejects invalid coordinates", () => {
    expect(googleEarthHref(candidate)).toBe("https://earth.google.com/web/search/31.7%2C35.2");
    expect(new URL(googleMapsHref(candidate)).searchParams.get("query")).toBe("31.7,35.2");
    expect(new URL(googleStreetViewHref(candidate)).searchParams.get("map_action")).toBe("pano");
    expect(() => googleEarthHref({ ...candidate, lat: 91 })).toThrow();
    expect(() => googleMapsHref({ ...candidate, lon: NaN })).toThrow();
  });
  it("distinguishes high source confidence from known event precision", () => {
    expect(geographyStatus(place)).toBe("Proposed identification");
    expect(geographyStatus({ ...place, candidates: [] })).toBe("Location unresolved");
    expect(geographyStatus({ ...place, unresolved: [{ kind: "unknown_place", description: "Unknown", score: 1000 }] })).toContain("unresolved");
    expect(geographyPrecisionLabel({ ...candidate, coordinateKind: "settlement" })).toContain("unknown");
    expect(geographyPrecisionLabel({ ...candidate, coordinateKind: "center" })).toContain("Approximate");
  });
  it("exports valid escaped KML, keeps alternatives and invents no unknown pins", () => {
    const unknown = { ...place, id: "a234567", name: "Unknown", candidates: [] };
    const kml = geographyKml([{ ...place, candidates: [candidate, { ...candidate, id: "a123456-1-0", lat: 32 }] }, unknown], "Test <atlas>", "csb", "https://example.com");
    const doc = new DOMParser().parseFromString(kml, "application/xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.getElementsByTagName("Folder")).toHaveLength(2);
    expect(doc.getElementsByTagName("Placemark")).toHaveLength(2);
    expect(doc.getElementsByTagName("coordinates")[0].textContent).toBe("35.2,31.7,0");
    expect(kml).toContain("not proven event sites");
    expect(kml).toContain("https://example.com/read/Act/4");
    expect(doc.getElementsByTagName("name")[0].textContent).toBe("Test <atlas>");
    expect(() => geographyKml([place], "test", "all", "javascript:alert(1)")).toThrow();
  });
});

describe("bundled source atlas", () => {
  it("validates every place and reference in the actual pinned import", () => {
    const atlas = geographyAtlasSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "public/bible-geography/atlas-v1.json"), "utf8")));
    expect(atlas.source.commit).toBe("7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f");
    expect(atlas.places.length).toBeGreaterThan(1000);
    expect(new Set(atlas.places.map((entry) => entry.id)).size).toBe(atlas.places.length);
    for (const entry of atlas.places) for (const reference of entry.references) expect(reference.c).toBeLessThanOrEqual(BOOKS[reference.b - 1].chapters);
    const john9 = filterGeographyPlaces(atlas.places, { ...all, book: 43, chapter: 9, translation: "csb" });
    expect(john9.some((entry) => entry.name.toLowerCase().includes("siloam"))).toBe(true);
    expect(atlas.places.some((entry) => !entry.candidates.length)).toBe(true);
  });
});
