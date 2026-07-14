/**
 * Shared helpers for the children-book reference-image generation pipeline.
 *
 * The Supabase edge runtime (Deno) cannot import the app's `@/` modules, so the
 * security-sensitive parts live here:
 *   • an allow-list so only approved registry paths are ever fetched (no SSRF),
 *   • resolution of approved reference-image BYTES (storage bucket → public URL),
 *   • the deterministic generation fingerprint (mirrors the app's logic), and
 *   • the versioned storage path so a version bump cannot return a stale image.
 */

export const REFERENCE_BUCKET = "children-book-references";

/** Only approved, registry-shaped relative paths may be fetched. */
const ALLOWED_REFERENCE_PATH =
  /^children-books\/(?:character-bibles|references)\/[a-z0-9/_-]+\.(?:png|webp|jpe?g)$/i;

export function isAllowedReferencePath(path: string): boolean {
  return typeof path === "string" && ALLOWED_REFERENCE_PATH.test(path);
}

export type ReferenceImageInput = {
  role?: "studio-style" | "character";
  characterId?: string;
  path: string;
  version?: string;
};

export type ResolvedReferenceBytes = {
  role: string;
  characterId?: string;
  path: string;
  version?: string;
  bytes: Uint8Array;
  contentType: string;
};

type StorageDownloader = {
  storage: {
    from: (bucket: string) => {
      download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
    };
  };
};

function contentTypeFor(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "image/png";
}

function fileNameFor(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || "reference.png";
}

async function downloadFromBucket(
  admin: StorageDownloader,
  path: string,
): Promise<Uint8Array | null> {
  try {
    const { data, error } = await admin.storage.from(REFERENCE_BUCKET).download(path);
    if (error || !data) return null;
    const buf = new Uint8Array(await data.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

/**
 * Resolve approved reference images to bytes. Tries the references storage bucket
 * first, then a trusted public asset base URL (never a client-supplied URL).
 */
export async function resolveReferenceBytes(
  admin: StorageDownloader,
  refs: ReferenceImageInput[],
  assetBaseUrl?: string,
): Promise<{ images: ResolvedReferenceBytes[]; err?: string }> {
  const base = assetBaseUrl?.trim().replace(/\/$/, "");
  const images: ResolvedReferenceBytes[] = [];

  for (const ref of refs) {
    if (!ref || !isAllowedReferencePath(ref.path)) {
      return { images: [], err: `Disallowed or invalid reference path: ${ref?.path ?? "(none)"}` };
    }

    let bytes = await downloadFromBucket(admin, ref.path);
    if (!bytes && base) bytes = await fetchBytes(`${base}/${ref.path}`);
    if (!bytes) {
      return {
        images: [],
        err: `Reference image not found: ${ref.path}. Seed the ${REFERENCE_BUCKET} bucket or set CHILDREN_BOOK_ASSET_BASE_URL.`,
      };
    }

    images.push({
      role: ref.role ?? "character",
      characterId: ref.characterId,
      path: ref.path,
      version: ref.version,
      bytes,
      contentType: contentTypeFor(ref.path),
    });
  }

  return { images };
}

export function referenceFileName(path: string): string {
  return fileNameFor(path);
}

export type VersionMetadata = {
  studioStyleVersion?: string;
  worldBibleVersion?: string;
  promptVersion?: string;
  sanitizerVersion?: string;
  characterReferenceVersions?: Record<string, string>;
};

export type FingerprintInput = {
  bookSlug: string;
  imageKind: string;
  pageNumber?: number;
  versionMetadata: VersionMetadata;
  prompt: string;
  model: string;
  quality: string;
  size: string;
};

/** Two 32-bit FNV-1a passes → 16-char hex (mirrors src/.../generationFingerprint). */
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

function canonicalRefVersions(versions: Record<string, string> = {}): string {
  return Object.keys(versions)
    .sort()
    .map((k) => `${k}:${versions[k]}`)
    .join(",");
}

export function generationFingerprint(input: FingerprintInput): string {
  const v = input.versionMetadata ?? {};
  const payload = [
    `book=${input.bookSlug}`,
    `kind=${input.imageKind}`,
    `page=${input.pageNumber ?? ""}`,
    `style=${v.studioStyleVersion ?? ""}`,
    `world=${v.worldBibleVersion ?? ""}`,
    `prompt=${v.promptVersion ?? ""}`,
    `sanitizer=${v.sanitizerVersion ?? ""}`,
    `refs=${canonicalRefVersions(v.characterReferenceVersions)}`,
    `model=${input.model}`,
    `quality=${input.quality}`,
    `size=${input.size}`,
    `text=${input.prompt}`,
  ].join("|");
  return stableHashHex(payload);
}

export function versionedStoragePath(
  bookSlug: string,
  imageKind: string,
  pageNumber: number | undefined,
  styleVersion: string,
  hash: string,
): string {
  const safeSlug = bookSlug.replace(/[^a-z0-9-]/gi, "").slice(0, 80);
  const style = (styleVersion || "v0").replace(/[^a-z0-9.-]/gi, "").slice(0, 20);
  const leaf =
    imageKind === "cover"
      ? "cover"
      : imageKind === "closing"
        ? "end"
        : String(Math.max(1, Math.floor(pageNumber ?? 1))).padStart(2, "0");
  return `books/${safeSlug}/${style}/${hash}/${leaf}.png`;
}
