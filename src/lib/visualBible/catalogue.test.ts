import { describe, expect, it } from "vitest";
import { BOOKS } from "@/data/books";
import { BIBLE_PLATES } from "@/data/biblePlates";
import { STUDY_MAPS } from "@/lib/bible/studyBackMatter";
import { VISUAL_KINDS } from "@/data/visualBible/types";
import { VISUAL_CATALOGUE } from "./catalogue";
import { SEED_VISUALS, VISUAL_SEED, hasVisualSeedForChapter } from "./seed";
import { deduplicateVisuals, filterVisuals, normalizeVisualText, passageLabel, passageMatches, visualPage } from "./query";
import { assertImageUrl, downloadImage, validateSeed } from "../../../scripts/acquire-visual-bible.mjs";

describe("visual Bible catalog", () => {
  it("validates the curated seed and every canonical chapter association", () => {
    expect(() => validateSeed(VISUAL_SEED)).not.toThrow();
    expect(VISUAL_SEED).toHaveLength(21);
    for (const asset of VISUAL_CATALOGUE) {
      expect(asset.thumbnailUrl).toMatch(/^\/(bible-plates|visual-bible)\//);
      expect(asset.detailUrl).toMatch(/^\/(bible-plates|visual-bible)\//);
      for (const p of asset.passages) {
        const book = BOOKS.find((b) => b.abbr === p.book);
        expect(book, `${asset.id}: ${p.book}`).toBeDefined();
        expect(p.chapter).toBeGreaterThan(0);
        expect(p.endChapter ?? p.chapter).toBeLessThanOrEqual(book!.chapters);
      }
    }
    expect(new Set(VISUAL_CATALOGUE.map((a) => a.kind))).toEqual(new Set(VISUAL_KINDS));
  });
  it("retains all maps and does not modify the legacy plate catalog", () => {
    expect(BIBLE_PLATES).toHaveLength(527);
    expect(VISUAL_CATALOGUE.filter((a) => a.id.startsWith("map-"))).toHaveLength(STUDY_MAPS.length);
    for (const map of STUDY_MAPS) {
      expect(VISUAL_CATALOGUE.find((a) => a.id === `map-${map.id}`)?.source.license).toBe(map.license);
    }
    expect(VISUAL_CATALOGUE.filter((a) => a.review === "source-checked")).toHaveLength(20);
    expect(VISUAL_CATALOGUE.filter((a) => a.id.startsWith("plate-")).every((a) => a.review === "legacy")).toBe(true);
  });
  it("supports accents, artists, periods and Scripture search", () => {
    expect(normalizeVisualText("Dürer — GENESIS 3:1")).toBe("durer genesis 3 1");
    expect(filterVisuals(SEED_VISUALS, { query: "Durer Genesis" }).map((a) => a.id)).toEqual(["met-336222"]);
    expect(filterVisuals(SEED_VISUALS, { query: "Rembrandt 1648", book: "Mat", chapter: 19 })).toHaveLength(1);
    expect(filterVisuals(SEED_VISUALS, { kind: "artifact", book: "Luk", chapter: 2 }).map((a) => a.id)).toEqual(["met-547804"]);
    expect(filterVisuals(SEED_VISUALS, { query: "missing reference" })).toHaveLength(0);
  });
  it("uses inclusive chapter ranges without inventing exact verses", () => {
    const p = SEED_VISUALS.find((a) => a.kind === "timeline")!.passages[0];
    expect(passageMatches(p, "Act", 1)).toBe(true);
    expect(passageMatches(p, "Act", 28)).toBe(true);
    expect(passageMatches(p, "Act", 29)).toBe(false);
    expect(passageMatches(p, "Luk", 1)).toBe(false);
    expect(passageLabel(p)).toBe("Acts 1–28");
    expect(hasVisualSeedForChapter("Luk", 2)).toBe(true);
    expect(hasVisualSeedForChapter("Luk", 99)).toBe(false);
  });
  it("merges duplicate source records, preserving multiple passage associations", () => {
    const original = SEED_VISUALS[0];
    const otherPassage = { ...original, id: "copy", passages: SEED_VISUALS[1].passages };
    const distinct = { ...original, id: "different", source: { ...original.source, url: `${original.source.url}/different` } };
    const result = deduplicateVisuals([original, otherPassage, distinct]);
    expect(result).toHaveLength(2);
    expect(result[0].passages).toHaveLength(2);
    expect(original.passages).toHaveLength(1);
  });
  it("bounds pages, including NaN, empty and out-of-range requests", () => {
    const list = Array.from({ length: 55 }, () => SEED_VISUALS[0]);
    expect(visualPage(list, 1).items).toHaveLength(24);
    expect(visualPage(list, 2).items).toHaveLength(24);
    expect(visualPage(list, 100).items).toHaveLength(7);
    expect(visualPage(list, NaN).page).toBe(1);
    expect(visualPage([], -1)).toEqual({ page: 1, pageCount: 1, items: [] });
  });
});
describe("acquisition safety", () => {
  it("rejects duplicates, missing credits and unsupported rights", () => {
    const asset = VISUAL_SEED[0];
    expect(() => validateSeed([asset, asset])).toThrow();
    expect(() => validateSeed([{ ...asset, id: "../escape" }])).toThrow();
    expect(() => validateSeed([{ ...asset, source: { ...asset.source, credit: "" } }])).toThrow();
    expect(() => validateSeed([{ ...asset, source: { ...asset.source, license: "All rights reserved" } }])).toThrow();
    expect(() => validateSeed([{ ...asset, review: "legacy" }])).toThrow();
  });
  it("rejects insecure URLs and off-allowlist redirect targets", async () => {
    for (const url of ["http://collectionapi.metmuseum.org/image", "https://127.0.0.1/image", "https://collectionapi.metmuseum.org.evil.example/image", "https://user:password@collectionapi.metmuseum.org/image"]) expect(() => assertImageUrl(url)).toThrow();
    const redirect = async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } });
    await expect(downloadImage(VISUAL_SEED[0].imageUrl, redirect)).rejects.toThrow();
  });
  it("rejects HTML and oversized responses instead of publishing broken images", async () => {
    await expect(downloadImage(VISUAL_SEED[0].imageUrl, async () => new Response("error", { headers: { "content-type": "text/html" } }))).rejects.toThrow("Non-raster");
    await expect(downloadImage(VISUAL_SEED[0].imageUrl, async () => new Response("large", { headers: { "content-type": "image/jpeg", "content-length": "30000001" } }))).rejects.toThrow("too large");
  });
});
