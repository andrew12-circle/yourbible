import { describe, expect, it } from "vitest";
import { collectionCoverage, collectionsFor, filterCollection, orderCollection } from "./collections";
import { SEED_VISUALS, CURATED_VISUALS, ALL_VISUAL_SEED } from "./seed";
import { curatedReaderPlates, selectReaderVisuals } from "@/lib/bible/readerVisuals";
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
  it("validates all publication records rather than treating the target list as imported art", () => {
    expect(() => validateSeed(ALL_VISUAL_SEED)).not.toThrow();
    expect(new Set(CURATED_VISUALS.map(a => a.id)).size).toBe(CURATED_VISUALS.length);
  });
  it("uses lightweight reader derivatives and respects library-only connections", () => {
    for (const asset of CURATED_VISUALS) for (const p of asset.passages) {
      const plate = curatedReaderPlates(p.book, p.chapter).find(item => item.visualAssetId === asset.id);
      if (p.inline === false && !asset.passages.some(other => other.book === p.book && other.chapter === p.chapter && other.inline !== false)) expect(plate).toBeUndefined();
      else if (asset.readerUrl) expect(plate?.assetPath).toBe(asset.readerUrl);
    }
  });
  it("keeps every published iconic work eligible and prioritizes it at its declared passage", () => {
    const iconic = CURATED_VISUALS.filter(a => a.iconic);
    for (const asset of iconic) {
      const p = asset.passages.find(connection => connection.inline !== false);
      if (!p) continue;
      const selected = selectReaderVisuals(p.book, p.chapter, []);
      expect(selected.some(plate => plate.visualAssetId === asset.id), asset.title).toBe(true);
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
