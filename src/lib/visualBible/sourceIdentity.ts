import type { VisualAsset } from "@/data/visualBible/types";

/** Keep object views separate; only canonical Commons file names normalize underscores. */
export function visualSourceIdentity(asset: VisualAsset): string {
  let source = asset.source.url || asset.id;
  try {
    const url = new URL(source);
    if (url.hostname === "commons.wikimedia.org" && url.pathname.startsWith("/wiki/File:")) {
      const filename = decodeURIComponent(url.pathname.slice("/wiki/File:".length)).replace(/_/g, " ");
      source = `https://commons.wikimedia.org/wiki/File:${filename}`;
    }
  } catch { /* Keep malformed legacy URLs distinct rather than guessing a source. */ }
  return JSON.stringify([asset.kind, source, asset.source.objectId ?? "", asset.source.viewId ?? ""]);
}
