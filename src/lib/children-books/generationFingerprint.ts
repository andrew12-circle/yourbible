/**
 * Deterministic generation fingerprint for version-aware caching.
 *
 * The old cache keyed only on book slug + page path, so a new approved studio
 * style or character reference could still return a stale image. The fingerprint
 * folds every input that changes the output — studio style version, character
 * reference versions, world-bible version, prompt version, the composed prompt,
 * model, quality, and size — into a stable hash. A version bump changes the hash,
 * changes the storage path, and makes stale cache hits impossible.
 *
 * The hash is a plain (non-crypto) rolling hash so it runs identically in the
 * browser, Deno edge functions, and Node scripts with no async or dependencies.
 */

export const PROMPT_VERSION = "v3";

export type StorybookImageKind = "page" | "cover" | "closing";

export type GenerationFingerprintInput = {
  bookSlug: string;
  imageKind: StorybookImageKind;
  pageNumber?: number;
  studioStyleVersion: string;
  worldBibleVersion: string;
  promptVersion: string;
  sanitizerVersion: string;
  /** Per-character approved reference versions actually used. */
  characterReferenceVersions: Record<string, string>;
  /** The fully composed prompt sent to the model. */
  prompt: string;
  model: string;
  quality: string;
  size: string;
};

/** Two 32-bit FNV-1a passes → 16-char hex (low collision, deterministic). */
export function stableHashHex(value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef ^ value.length;
  for (let i = 0; i < value.length; i += 1) {
    const c = value.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x85ebca6b);
  }
  h1 >>>= 0;
  h2 >>>= 0;
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

function canonicalRefVersions(versions: Record<string, string>): string {
  return Object.keys(versions)
    .sort()
    .map((k) => `${k}:${versions[k]}`)
    .join(",");
}

/** Canonical, stable string of all fingerprint inputs (useful for debugging). */
export function fingerprintPayload(input: GenerationFingerprintInput): string {
  return [
    `book=${input.bookSlug}`,
    `kind=${input.imageKind}`,
    `page=${input.pageNumber ?? ""}`,
    `style=${input.studioStyleVersion}`,
    `world=${input.worldBibleVersion}`,
    `prompt=${input.promptVersion}`,
    `sanitizer=${input.sanitizerVersion}`,
    `refs=${canonicalRefVersions(input.characterReferenceVersions)}`,
    `model=${input.model}`,
    `quality=${input.quality}`,
    `size=${input.size}`,
    `text=${input.prompt}`,
  ].join("|");
}

export function generationFingerprint(input: GenerationFingerprintInput): string {
  return stableHashHex(fingerprintPayload(input));
}
