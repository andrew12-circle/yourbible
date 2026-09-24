import type { BiblePlate } from "@/data/biblePlates/types";
import type { VisualAsset } from "@/data/visualBible/types";
import { geographyForPlate } from "@/data/visualBible/geography";
import { passageMatches } from "./query";

/** Does not alter reader units, page boundaries, or the featured plate's stable identity. */
export function passageVisualChoices(plate: BiblePlate, catalogue: readonly VisualAsset[], legacy: readonly BiblePlate[] = []): VisualAsset[] {
  const currentId = plate.visualAssetId ?? `plate-${plate.id}`;
  const scene = geographyForPlate(plate.bookAbbr, plate.chapter, plate.beforeVerse, plate.kind);
  const range = scene?.passages.find(p => p.book === plate.bookAbbr && p.chapter === plate.chapter);
  const legacyById = new Map(legacy.map(p => [`plate-${p.id}`, p]));
  const candidates = catalogue.filter(asset => {
    if (asset.id === currentId) return true;
    const associations = asset.passages.filter(p => passageMatches(p, plate.bookAbbr, plate.chapter));
    if (!associations.length) return false;
    if (!range || asset.kind !== "artwork") return true;
    // A broad legacy chapter match is not enough to call another event the triumphal entry.
    const original = legacyById.get(asset.id);
    if (original) return original.beforeVerse >= range.verse && original.beforeVerse <= range.endVerse;
    return associations.some(p => p.verse !== undefined && p.verse <= range.endVerse && (p.endVerse ?? p.verse) >= range.verse);
  });
  const seen = new Set<string>();
  return candidates.sort((a, b) => Number(b.id === currentId) - Number(a.id === currentId) ||
    Number(Boolean(b.iconic)) - Number(Boolean(a.iconic)) || (a.readerRank ?? 50) - (b.readerRank ?? 50) || a.title.localeCompare(b.title))
    .filter(asset => { if (seen.has(asset.id)) return false; seen.add(asset.id); return true; });
}
