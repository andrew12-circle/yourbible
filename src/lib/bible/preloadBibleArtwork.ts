import type { BiblePlate } from "@/lib/bible/biblePlates";
import { biblePlateAssetUrl } from "@/lib/bible/biblePlateAssets";

const pending = new Map<string, Promise<void>>();
/** Small, deduplicated near-page working set; never downloads the whole catalog. */
export function preloadBibleArtwork(plate: BiblePlate): Promise<void> {
  const url = biblePlateAssetUrl(plate);
  const existing = pending.get(url);
  if (existing) return existing;
  if (typeof Image === "undefined") return Promise.resolve();
  const promise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const decoded = typeof image.decode === "function" ? image.decode() : Promise.resolve();
      void decoded.then(resolve, reject);
    };
    image.onerror = () => reject(new Error("Artwork unavailable"));
    image.src = url;
  });
  pending.set(url, promise);
  void promise.catch(() => { if (pending.get(url) === promise) pending.delete(url); });
  while (pending.size > 24) pending.delete(pending.keys().next().value!);
  return promise;
}
