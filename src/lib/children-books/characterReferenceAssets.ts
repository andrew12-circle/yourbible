/**
 * Layer 2 — Character Reference Assets (versioned, approved model sheets).
 *
 * This registry is the single source of truth for the APPROVED reference images
 * that must be supplied to the image model on every applicable generation so the
 * characters keep their identity instead of being reinvented on every page.
 *
 * Text bibles (Layer 3) clarify identity; these images ARE the identity. The
 * generation pipeline sends:
 *   1. the permanent studio-style anchor (illustration language), then
 *   2. the heroine reference, then
 *   3. supporting-character references — for characters actually present only.
 *
 * Approved assets are versioned. A new approved design must create v2, v3, …;
 * never silently replace an approved asset. Paths are relative to `public/` (so
 * the app, the batch script, and the edge function can all resolve them).
 */

export type StorybookCharacterId =
  | "lilly"
  | "tish"
  | "andrew"
  | "winston"
  | "aurora"
  | "liora"
  | "mara";

export type ReferenceRole = "studio-style" | "character";

export type CharacterReferenceAsset = {
  id: StorybookCharacterId;
  version: string;
  displayName: string;
  /** Approved reference image paths (relative to public/), best-first. */
  referenceImagePaths: string[];
  /** Short identity lock sent alongside the image for this character. */
  requiredIdentityRules: string;
};

/** A resolved reference image ready to be sent to the image model. */
export type ResolvedReferenceImage = {
  role: ReferenceRole;
  characterId?: StorybookCharacterId;
  /** Path relative to public/ — the ONLY approved source of image bytes. */
  path: string;
  version: string;
};

/**
 * The permanent studio-style anchor — a dedicated, approved PURE-STYLE exemplar
 * that carries the bright, airy, clean-linework studio look (no specific named
 * character). It is sent FIRST on every generation so the whole library keeps one
 * consistent style. Generate/approve it once with:
 *   npx tsx scripts/generate-children-book-illustrations.ts --style-anchor --force
 *
 * Until the dedicated anchor is approved, generation falls back to the shared
 * family model sheet (`fallbackPath`) so nothing breaks in the meantime.
 */
export const STUDIO_STYLE_ANCHOR = {
  version: "v1",
  path: "children-books/references/studio/v1/style-anchor.png",
  fallbackPath: "children-books/character-bibles/reference-family-model-sheet.png",
} as const;

/** Ordered candidate paths for the studio anchor bytes (dedicated → fallback). */
export function studioAnchorCandidatePaths(): string[] {
  return [STUDIO_STYLE_ANCHOR.path, STUDIO_STYLE_ANCHOR.fallbackPath];
}

/**
 * The approved family model sheet contains Lilly (age 5), Tish, Andrew, and
 * Winston on a single plate, so any of the recurring family members resolves to
 * it. Dedicated per-heroine sheets carry the fairy-tale heroines. When a new
 * per-character sheet is approved, point that id at its own path and bump version.
 */
const FAMILY_SHEET = "children-books/character-bibles/reference-family-model-sheet.png";

export const CHARACTER_REFERENCE_ASSETS: Record<
  StorybookCharacterId,
  CharacterReferenceAsset
> = {
  lilly: {
    id: "lilly",
    version: "v1",
    displayName: "Lilly",
    referenceImagePaths: [FAMILY_SHEET],
    requiredIdentityRules:
      "Lilly: five-year-old girl; proportional head (~one-sixth of standing height); softly oval face; short light-brown/chestnut curls ending around the ears and jaw with a side part and a large white or pale-blue bow; warm brown/hazel almond eyes; small natural nose; broad joyful smile. Never long or shoulder-length hair; never toddler or adult proportions; never orange skin.",
  },
  tish: {
    id: "tish",
    version: "v1",
    displayName: "Tish",
    referenceImagePaths: [FAMILY_SHEET],
    requiredIdentityRules:
      "Tish (Mama): adult mother; refined oval face; long pale-blonde hair; light eyes; bright recognizable smile; natural graceful adult proportions. Never a generic blonde princess; never younger than Lilly's mother; face fixed regardless of wardrobe.",
  },
  andrew: {
    id: "andrew",
    version: "v1",
    displayName: "Andrew",
    referenceImagePaths: [FAMILY_SHEET],
    requiredIdentityRules:
      "Andrew (Daddy): adult father; short dark-brown hair neatly side-swept; clean-shaven or only very light natural shadow; recognizable eyebrows, eyes, nose, smile, and jaw; natural adult male proportions. Never a generic handsome prince; no curly hair; no full beard; face fixed regardless of wardrobe.",
  },
  winston: {
    id: "winston",
    version: "v1",
    displayName: "Winston",
    referenceImagePaths: [FAMILY_SHEET],
    requiredIdentityRules:
      "Winston: adult Airedale Terrier; black saddle with warm tan legs, face, and beard; rectangular terrier muzzle; distinctive beard and eyebrows; folded V-shaped ears; athletic medium-large build; expressive dark eyes. Never a generic doodle, never a golden retriever, never a small puppy; coat pattern and muzzle shape fixed.",
  },
  aurora: {
    id: "aurora",
    version: "v1",
    displayName: "Aurora",
    referenceImagePaths: [
      "children-books/character-bibles/aurora/turnaround.png",
      "children-books/character-bibles/aurora/outfits.png",
    ],
    requiredIdentityRules:
      "Aurora: distinct heroine; graceful oval face; calm serene expression; long flowing golden/honey-gold hair; her own face shape, eyes, nose, and silhouette. Never Lilly's short curls; never a duplicate of another heroine.",
  },
  liora: {
    id: "liora",
    version: "v1",
    displayName: "Liora",
    referenceImagePaths: [
      "children-books/character-bibles/liora/turnaround.png",
      "children-books/character-bibles/liora/outfits.png",
    ],
    requiredIdentityRules:
      "Liora: distinct coastal heroine; lively oval face with soft simplified freckles; sea-green eyes; deep auburn/copper-red long flowing hair; her own silhouette. Never Lilly's short curls; never a duplicate of another heroine.",
  },
  mara: {
    id: "mara",
    version: "v1",
    displayName: "Mara",
    referenceImagePaths: [
      "children-books/character-bibles/mara/turnaround.png",
      "children-books/character-bibles/mara/outfits.png",
    ],
    requiredIdentityRules:
      "Mara: distinct garden heroine; earnest face with a firm kind jaw; rich dark-brown gathered curls; bright brown eyes; her own silhouette. Never Lilly's short curls; never a duplicate of another heroine.",
  },
};

export const STORYBOOK_CHARACTER_IDS = Object.keys(
  CHARACTER_REFERENCE_ASSETS,
) as StorybookCharacterId[];

export function isStorybookCharacterId(id: string): id is StorybookCharacterId {
  return id in CHARACTER_REFERENCE_ASSETS;
}

export function getCharacterReferenceAsset(
  id: string,
): CharacterReferenceAsset | undefined {
  return isStorybookCharacterId(id) ? CHARACTER_REFERENCE_ASSETS[id] : undefined;
}

/** Default approved version for a character (used to build fingerprints). */
export function characterReferenceVersion(id: StorybookCharacterId): string {
  return CHARACTER_REFERENCE_ASSETS[id].version;
}

export type ResolveReferencesInput = {
  /** Heroine of the book (sent second, right after the studio anchor). */
  heroId?: StorybookCharacterId;
  /** Recurring supporting characters present in the scene. */
  presentCharacterIds?: StorybookCharacterId[];
  /** Pin specific approved versions per character (defaults to registry). */
  characterReferenceVersions?: Partial<Record<StorybookCharacterId, string>>;
};

/**
 * Resolve the ordered, de-duplicated list of approved reference images for a
 * scene: studio anchor first, heroine second, supporting characters after.
 * Only the primary (best-first) approved image per character is sent, and the
 * same underlying path is never sent twice (the family sheet covers the whole
 * family in one plate).
 */
export function resolveSceneReferenceImages(
  input: ResolveReferencesInput,
): ResolvedReferenceImage[] {
  const resolved: ResolvedReferenceImage[] = [];
  const seenPaths = new Set<string>();

  const pushPath = (
    role: ReferenceRole,
    path: string,
    version: string,
    characterId?: StorybookCharacterId,
  ) => {
    if (!path || seenPaths.has(path)) return;
    seenPaths.add(path);
    resolved.push({ role, characterId, path, version });
  };

  pushPath("studio-style", STUDIO_STYLE_ANCHOR.path, STUDIO_STYLE_ANCHOR.version);

  const order: StorybookCharacterId[] = [];
  if (input.heroId) order.push(input.heroId);
  for (const id of input.presentCharacterIds ?? []) {
    if (!order.includes(id)) order.push(id);
  }

  for (const id of order) {
    const asset = CHARACTER_REFERENCE_ASSETS[id];
    if (!asset) continue;
    const version = input.characterReferenceVersions?.[id] ?? asset.version;
    const primary = asset.referenceImagePaths[0];
    if (primary) pushPath("character", primary, version, id);
  }

  return resolved;
}

/** Present-character ids that have NO approved reference image resolvable. */
export function missingCharacterReferences(
  ids: StorybookCharacterId[],
): StorybookCharacterId[] {
  return ids.filter((id) => {
    const asset = CHARACTER_REFERENCE_ASSETS[id];
    return !asset || asset.referenceImagePaths.length === 0;
  });
}

/**
 * Character ids whose approved identity image IS the studio anchor image. With a
 * dedicated pure-style anchor this is empty (every character is sent as its own
 * identity reference). It only returns ids if the anchor is pointed back at a
 * character's plate (e.g. the family sheet), in which case the anchor must be
 * treated as an identity reference for them rather than a style-only image.
 */
export function studioAnchorCoveredCharacterIds(): StorybookCharacterId[] {
  return STORYBOOK_CHARACTER_IDS.filter(
    (id) => CHARACTER_REFERENCE_ASSETS[id].referenceImagePaths[0] === STUDIO_STYLE_ANCHOR.path,
  );
}

/** Approved reference version for a character, honoring per-book pins. */
export function resolvedCharacterVersion(
  id: StorybookCharacterId,
  pins?: Partial<Record<StorybookCharacterId, string>>,
): string {
  return pins?.[id] ?? CHARACTER_REFERENCE_ASSETS[id].version;
}
