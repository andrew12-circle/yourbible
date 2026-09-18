type CachedUrl = { url: string; expiresAt: number };
export type StableMediaUrlCache = {
  urls: Map<string, CachedUrl>;
  pending: Map<string, Promise<string>>;
};
// Photo/video signers issue one-hour URLs. Renew before expiry, not on each save.
const CACHE_MS = 55 * 60 * 1000;
const MAX_URLS = 1000;

/** The caller owns this cache per account/vault session; nothing is persisted. */
export async function stableMediaUrls(
  paths: string[], kind: "photo" | "video", cache: StableMediaUrlCache,
  sign: (paths: string[]) => Promise<Record<string, string>>,
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const now = Date.now();
  const keyFor = (path: string) => `${kind}:${path}`;
  // Handwriting overwrites its canonical path. Never keep a stale sketch URL.
  const cacheable = (path: string) => kind !== "photo" || !/sketch-[^/]*\.png$/i.test(path);
  for (const [key, item] of cache.urls) if (item.expiresAt <= now) cache.urls.delete(key);
  const missing = unique.filter((path) => !cache.urls.has(keyFor(path)) && !cache.pending.has(keyFor(path)));
  if (missing.length) {
    const batch = Promise.resolve().then(() => sign(missing));
    for (const path of missing) {
      const key = keyFor(path);
      const pending = batch.then((signed) => {
        const url = signed[path];
        if (!url) throw new Error("A journal thumbnail could not be refreshed. Please retry.");
        if (cacheable(path)) {
          cache.urls.set(key, { url, expiresAt: now + CACHE_MS });
          while (cache.urls.size > MAX_URLS) cache.urls.delete(cache.urls.keys().next().value!);
        }
        return url;
      }).finally(() => { if (cache.pending.get(key) === pending) cache.pending.delete(key); });
      cache.pending.set(key, pending);
    }
  }
  return Object.fromEntries(await Promise.all(unique.map(async (path) => {
    const key = keyFor(path);
    const url = cache.urls.get(key)?.url ?? await cache.pending.get(key);
    if (!url) throw new Error("A journal thumbnail could not be refreshed. Please retry.");
    return [path, url];
  })));
}
