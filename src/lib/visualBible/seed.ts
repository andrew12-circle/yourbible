import rawSeed from "@/data/visualBible/seed.json";
import readerExpansion from "@/data/visualBible/readerExpansion.json";
import collectionExpansion from "@/data/visualBible/collectionExpansion.json";
import type { VisualAsset, VisualSeed } from "@/data/visualBible/types";
import { passageMatches } from "./query";

/** Retained for callers/tests that use the original acquisition batch as a fixture. */
export const VISUAL_SEED = [...rawSeed, ...readerExpansion] as VisualSeed[];
export const COLLECTION_EXPANSION = collectionExpansion as VisualSeed[];
export const ALL_VISUAL_SEED: VisualSeed[] = [...VISUAL_SEED, ...COLLECTION_EXPANSION];
function toVisual(asset: VisualSeed): VisualAsset {
  const local = asset.imageUrl.startsWith("/");
  const base = `/visual-bible/v1/${asset.id}-${asset.revision}`;
  return { ...asset,
    thumbnailUrl: local ? asset.imageUrl : `${base}-thumb.webp`,
    detailUrl: local ? asset.imageUrl : `${base}-detail.webp`,
    readerUrl: !local && asset.readerDerivative ? `${base}-reader.webp` : undefined,
  };
}
export const SEED_VISUALS = VISUAL_SEED.map(toVisual);
export const CURATED_VISUALS = ALL_VISUAL_SEED.map(toVisual);
export function hasVisualSeedForChapter(book: string, chapter: number): boolean {
  return CURATED_VISUALS.some(asset => asset.passages.some(p => passageMatches(p, book, chapter)));
}
