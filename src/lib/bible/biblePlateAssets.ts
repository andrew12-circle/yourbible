import type { BiblePlate } from "@/data/biblePlates/types";

export const BIBLE_PLATE_ASSET_ROOT = "/bible-plates";
type IdentifiedAsset = Pick<BiblePlate, "id" | "assetPath">;

/** Never let reader artwork introduce third-party requests or traversal paths. */
export function isReaderAssetPath(path: string): boolean {
  return /^\/visual-bible\/v\d+\/[a-z0-9-]+\.(?:webp|svg)$/i.test(path)
    || /^\/bible-plates\/(?:maps\/)?[a-z0-9-]+\.webp$/i.test(path);
}
export function biblePlateAssetUrl(plate: IdentifiedAsset): string {
  if (plate.assetPath && isReaderAssetPath(plate.assetPath)) return plate.assetPath;
  return `${BIBLE_PLATE_ASSET_ROOT}/${encodeURIComponent(plate.id)}.webp`;
}
export function studyMapAssetUrl(map: Pick<BiblePlate, "id">): string {
  return `${BIBLE_PLATE_ASSET_ROOT}/maps/${encodeURIComponent(map.id)}.webp`;
}
