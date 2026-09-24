import { describe, expect, it } from "vitest";
import { collectionCoverage, collectionsFor, filterCollection, orderCollection } from "./collections";
import { SEED_VISUALS, CURATED_VISUALS, ALL_VISUAL_SEED } from "./seed";
import { VISUAL_CATALOGUE } from "./catalogue";
import { passageVisualChoices } from "./passageChoices";
import { curatedReaderPlates, selectReaderVisuals } from "@/lib/bible/readerVisuals";
import { inlinePlatesForChapter } from "@/lib/bible/chapterContext";
import { BIBLE_PLATES } from "@/data/biblePlates";
import { validateSeed } from "../../../scripts/acquire-visual-bible.mjs";

const work = { ...SEED_VISUALS[0], collections: ["masterworks" as const], iconic: true, period: "Baroque", technique: "painting" as const };
describe("five visual collections", () => {
  it("filters collections, icons, periods and techniques without changing the catalog", () => {
    const object = { ...SEED_VISUALS[4], collections: ["artifacts" as const] };
    expect(filterCollection([work, object], "iconic")).toEqual([work]);
    expect(filterCollection([work, object], "artifacts")).toEqual([object]);
    expect(filterCollection([work], "all", "Baroque", "painting")).toEqual([work]);
    expect(filterCollection([work], "all", "Renaissance")).toEqual([]);
  });
  it("does not count legacy illustrations as reviewed masterworks or views as separate objects", () => {
    const legacy = { ...work, id: "legacy", collections: undefined, iconic: undefined, review: "legacy" as const };
    expect(collectionsFor(legacy)).toEqual([]);
    const a = { ...work, id: "panel-a", workGroup: "altarpiece" };
    const b = { ...work, id: "panel-b", workGroup: "altarpiece" };
    const counts = collectionCoverage([a, b, legacy])[0];
    expect(counts.reviewed).toBe(2); expect(counts.works).toBe(1); expect(counts.goal).toBe(100);
  });
  it("orders iconic works ahead of the stable existing catalog", () => {
    const regular = { ...work, id: "ordinary", iconic: false };
    expect(orderCollection([regular, work]).map(a => a.id)).toEqual([work.id, "ordinary"]);
  });
  it("validates actual publication records and requires the acquired iconic collection", () => {
    expect(() => validateSeed(ALL_VISUAL_SEED)).not.toThrow();
    expect(CURATED_VISUALS.length).toBeGreaterThanOrEqual(300);
    expect(new Set(CURATED_VISUALS.map(a => a.id)).size).toBe(CURATED_VISUALS.length);
    for (const id of ["masterworks-leonardo-supper", "masterworks-michelangelo-adam", "masterworks-caravaggio-matthew", "masterworks-van-eyck-ghent", "masterworks-van-eyck-lamb", "heritage-michelangelo-pieta", "heritage-sinai-icon", "heritage-sistine-ceiling"]) {
      expect(CURATED_VISUALS.find(a => a.id === id), id).toBeDefined();
    }
  });
  it("uses lightweight reader derivatives and respects library-only connections", () => {
    for (const asset of CURATED_VISUALS) for (const p of asset.passages) {
      const plate = curatedReaderPlates(p.book, p.chapter).find(item => item.visualAssetId === asset.id);
      if (asset.galleryOnly || (p.inline === false && !asset.passages.some(other => other.book === p.book && other.chapter === p.chapter && other.inline !== false))) expect(plate).toBeUndefined();
      else if (asset.readerUrl) expect(plate?.assetPath).toBe(asset.readerUrl);
    }
  });
  it("keeps published iconic alternatives reachable without forcing them all onto bounded pages", () => {
    for (const asset of CURATED_VISUALS.filter(a => a.iconic && !a.galleryOnly)) {
      const eligible = asset.passages.filter(p => p.inline !== false);
      if (!eligible.length) continue;
      expect(eligible.some(p => inlinePlatesForChapter(p.book, p.chapter).some(plate => passageVisualChoices(plate, VISUAL_CATALOGUE, BIBLE_PLATES).some(a => a.id === asset.id))), asset.title).toBe(true);
      const p = eligible[0];
      expect(curatedReaderPlates(p.book, p.chapter).some(plate => plate.visualAssetId === asset.id), asset.title).toBe(true);
      expect(selectReaderVisuals(p.book, p.chapter, []).length).toBeLessThanOrEqual(3);
    }
  });
  it("rejects unsupported rights, invented chapters and invalid checked dates", () => {
    const seed = ALL_VISUAL_SEED[0];
    expect(() => validateSeed([{ ...seed, passages: [{ ...seed.passages[0], book: "Bogus" }] }])).toThrow();
    expect(() => validateSeed([{ ...seed, passages: [{ ...seed.passages[0], chapter: 999 }] }])).toThrow();
    expect(() => validateSeed([{ ...seed, source: { ...seed.source, checkedOn: "2026-02-31" } }])).toThrow();
    expect(() => validateSeed([{ ...seed, source: { ...seed.source, license: "CC BY-NC 4.0" } }])).toThrow();
  });
});
