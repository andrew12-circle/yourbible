import type { BiblePlate } from "@/data/biblePlates/types";

/**
 * Public, versioned reader artwork. The download script writes WebP files here
 * so the reader never needs an image CDN to render a plate or study map.
 */
export const BIBLE_PLATE_ASSET_ROOT = "/bible-plates";

type IdentifiedAsset = Pick<BiblePlate, "id">;

function localAssetUrl(path: string): string {
  return `${BIBLE_PLATE_ASSET_ROOT}/${path}.webp`;
}

/** Stable local URL for a chapter-linked artwork plate. */
export function biblePlateAssetUrl(plate: IdentifiedAsset): string {
  return localAssetUrl(encodeURIComponent(plate.id));
}

/** Stable local URL for a study map. */
export function studyMapAssetUrl(map: IdentifiedAsset): string {
  return localAssetUrl(`maps/${encodeURIComponent(map.id)}`);
}
