import { describe, expect, it } from "vitest";
import type { VisualAsset, VisualPassage } from "@/data/visualBible/types";
import { deduplicateVisuals, filterVisuals } from "./query";
import { extractVisualReference } from "./referenceSearch";

function visual(id: string, book: string, chapter: number, range: Partial<VisualPassage> = {}): VisualAsset {
  return {
    id, kind: "artwork", title: id, creator: "Rembrandt", date: "1648", culture: "Dutch", medium: "Print",
    description: "Test visual", caution: "Context only", tags: [], review: "legacy", alt: id,
    thumbnailUrl: "/visual-bible/test.webp", detailUrl: "/visual-bible/test.webp",
    passages: [{ book, chapter, relationship: "depiction", note: "Test association", ...range }],
    source: { name: "Museum", url: `https://example.org/${id}`, license: "CC0", credit: "Museum" },
  };
}
const ids = (assets: VisualAsset[], query: string) => filterVisuals(assets, { query }).map((asset) => asset.id);

describe("reference-aware visual search", () => {
  const assets = [visual("john-one", "Jhn", 1), visual("john-nineteen", "Jhn", 19),
    visual("first-john", "1Jn", 1), visual("acts-map", "Act", 1, { endChapter: 28 })];
  it("does not mistake chapter 19 or a numbered epistle for John 1", () => {
    expect(ids(assets, "John 1")).toEqual(["john-one"]);
    expect(ids(assets, "1 John 1")).toEqual(["first-john"]);
    expect(ids(assets, "1John 1")).toEqual(["first-john"]);
    expect(ids(assets, "Jhn 19")).toEqual(["john-nineteen"]);
    expect(ids(assets, "Jn19")).toEqual(["john-nineteen"]);
    expect(ids(assets, "1Jn1")).toEqual(["first-john"]);
  });
  it("finds the middle and inclusive endpoints of a map's chapter range", () => {
    for (const chapter of [1, 15, 28]) expect(ids(assets, `Acts ${chapter}`)).toEqual(["acts-map"]);
    expect(ids(assets, "Acts 29")).toEqual([]);
  });
  it("rejects invalid and reversed chapter or verse ranges", () => {
    for (const query of ["John 0", "John 22", "John 19-1", "John 1:0", "John 1:10-5", "Acts 28-29", "1 John 6"]) {
      expect(extractVisualReference(query).reference?.valid, query).toBe(false);
      expect(ids(assets, query), query).toEqual([]);
    }
  });
  it("matches actual verse ranges while preserving chapter-level context", () => {
    const collection = [visual("burial", "Jhn", 19, { verse: 38, endVerse: 42 }),
      visual("earlier", "Jhn", 19, { verse: 1, endVerse: 5 }), visual("chapter-context", "Jhn", 19)];
    expect(ids(collection, "John 19:40")).toEqual(["burial", "chapter-context"]);
    expect(ids(collection, "John 19:6-37")).toEqual(["chapter-context"]);
    expect(ids(collection, "John 19:42–20:1")).toEqual(["burial", "chapter-context"]);
    expect(ids(collection, "John 19")).toHaveLength(3);
    expect(collection[2].passages[0].verse).toBeUndefined();
  });
  it("uses metadata words alongside references without using dates as verses", () => {
    expect(ids(assets, "Rembrandt John 1")).toEqual(["john-one"]);
    expect(ids(assets, "John 1 Rembrandt")).toEqual(["john-one"]);
    expect(ids(assets, "John 1 missing-artist")).toEqual([]);
    expect(ids(assets, "Rembrandt 1648")).toHaveLength(4);
    expect(ids([visual("burial", "Jhn", 19, { verse: 38, endVerse: 42 })], "John 19:16")).toEqual([]);
  });
  it("supports spaced numbered abbreviations and named chapter ranges", () => {
    expect(ids(assets, "1 Jn 1")).toEqual(["first-john"]);
    expect(ids(assets, "John 1–19")).toEqual(["john-one", "john-nineteen"]);
    expect(extractVisualReference("Psalm 23").reference?.book).toBe("Psa");
    expect(extractVisualReference("Song of Songs 2").reference?.book).toBe("Sng");
  });
  it("still intersects reference queries with the selected category and chapter scope", () => {
    expect(filterVisuals(assets, { query: "John 19", book: "Jhn", chapter: 1 })).toEqual([]);
    expect(filterVisuals(assets, { query: "Acts 15", kind: "artifact" })).toEqual([]);
  });
});

describe("object-view identity", () => {
  const first = visual("recto", "Jhn", 19);
  const recto = { ...first, source: { ...first.source, objectId: "W.839", viewId: "recto" } };
  const verso = { ...first, id: "verso", source: { ...recto.source, viewId: "verso" } };
  it("preserves different sides even when the museum source URL and title are identical", () => {
    expect(deduplicateVisuals([recto, verso]).map((asset) => asset.id)).toEqual(["recto", "verso"]);
  });
  it("merges repeated copies of the same view without mutating the input", () => {
    const other = { ...recto, id: "same-view", passages: visual("other", "Mat", 27).passages };
    const result = deduplicateVisuals([recto, other, verso]);
    expect(result).toHaveLength(2);
    expect(result[0].passages).toHaveLength(2);
    expect(recto.passages).toHaveLength(1);
    expect(verso.passages).toHaveLength(1);
  });
  it("preserves separate museum accession numbers on a shared collection page", () => {
    const other = { ...recto, id: "other-object", source: { ...recto.source, objectId: "W.840" } };
    expect(deduplicateVisuals([recto, other])).toHaveLength(2);
  });
  it("normalizes equivalent Commons file names, not arbitrary website URL paths", () => {
    const at = (url: string) => ({ ...first, source: { ...first.source, url } });
    expect(deduplicateVisuals([at("https://commons.wikimedia.org/wiki/File:Example_image.jpg"),
      at("https://commons.wikimedia.org/wiki/File:Example%20image.jpg")])).toHaveLength(1);
    expect(deduplicateVisuals([at("https://example.org/object_a"), at("https://example.org/object%20a")])).toHaveLength(2);
  });
  it("does not merge separate records when provenance is missing", () => {
    const one = { ...first, source: { ...first.source, url: "" } };
    expect(deduplicateVisuals([one, { ...one, id: "different" }])).toHaveLength(2);
  });
});
