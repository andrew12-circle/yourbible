import type { VisualAsset, VisualCollection } from "@/data/visualBible/types";

export const VISUAL_COLLECTIONS: { id: VisualCollection; title: string; description: string; goal: number }[] = [
  { id: "masterworks", title: "Masterpieces", description: "Old Masters and exceptional biblical paintings", goal: 100 },
  { id: "maps", title: "Biblical atlas", description: "Places, journeys, kingdoms and interpretive plans", goal: 50 },
  { id: "artifacts", title: "Ancient objects", description: "Inscriptions, coins, seals and everyday life", goal: 75 },
  { id: "heritage", title: "Sacred heritage", description: "Manuscripts, icons, mosaics, frescoes and sculpture", goal: 40 },
  { id: "places", title: "Biblical places", description: "Geography, excavations and modern site photography", goal: 50 },
];
export type CollectionFilter = VisualCollection | "iconic" | "all";
export function collectionsFor(asset: VisualAsset): VisualCollection[] {
  if (asset.collections?.length) return asset.collections;
  // Legacy illustrations are not counted as newly reviewed masterworks.
  if (asset.review === "legacy") return asset.kind === "map" || asset.kind === "architecture" ? ["maps"] : [];
  switch (asset.kind) {
    case "artwork": return ["masterworks"];
    case "artifact": return ["artifacts"];
    case "map": case "architecture": return ["maps"];
    case "manuscript": return ["heritage"];
    case "place-photo": return ["places"];
    default: return [];
  }
}
export function filterCollection(assets: readonly VisualAsset[], collection: CollectionFilter, period = "", technique = ""): VisualAsset[] {
  return assets.filter(asset => (collection === "all" || (collection === "iconic" ? asset.iconic === true : collectionsFor(asset).includes(collection)))
    && (!period || asset.period === period) && (!technique || asset.technique === technique));
}
export function collectionCoverage(assets: readonly VisualAsset[]) {
  return VISUAL_COLLECTIONS.map(collection => {
    const records = assets.filter(asset => collectionsFor(asset).includes(collection.id));
    const reviewed = records.filter(asset => asset.review !== "legacy");
    return { ...collection, available: records.length, reviewed: reviewed.length,
      works: new Set(reviewed.map(asset => asset.workGroup || asset.id)).size,
      legacy: records.length - reviewed.length };
  });
}
/** Icons first, then the stable existing/new curated order, then legacy material. */
export function orderCollection(assets: readonly VisualAsset[]): VisualAsset[] {
  return assets.map((asset, index) => ({ asset, index })).sort((a,b) =>
    Number(b.asset.iconic === true) - Number(a.asset.iconic === true)
    || Number(a.asset.review === "legacy") - Number(b.asset.review === "legacy")
    || a.index - b.index).map(({ asset }) => asset);
}
