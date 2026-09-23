import rawSeed from "@/data/visualBible/seed.json";
import readerExpansion from "@/data/visualBible/readerExpansion.json";
import type { VisualAsset, VisualSeed } from "@/data/visualBible/types";
import { passageMatches } from "./query";

// Acquisition reads these same two files; neither gallery nor reader calls museum APIs.
export const VISUAL_SEED = [...rawSeed, ...readerExpansion] as VisualSeed[];
export const SEED_VISUALS: VisualAsset[] = VISUAL_SEED.map((asset) => ({
  ...asset,
  thumbnailUrl: asset.imageUrl.startsWith("/") ? asset.imageUrl : `/visual-bible/v1/${asset.id}-${asset.revision}-thumb.webp`,
  detailUrl: asset.imageUrl.startsWith("/") ? asset.imageUrl : `/visual-bible/v1/${asset.id}-${asset.revision}-detail.webp`,
}));
export function hasVisualSeedForChapter(book: string, chapter: number): boolean {
  return SEED_VISUALS.some((asset) => asset.passages.some((p) => passageMatches(p, book, chapter)));
}
