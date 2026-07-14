/**
 * Lilly Storybooks prompt layers — think like an animation studio.
 *
 * Layer 1 — Studio Style: versioned global visual language (`studioStyles.ts`).
 * Layer 2 — World Bible: per story (`worldBibles.ts`).
 * Layer 3 — Character Bible: per heroine (`characterBibles.ts`).
 * Layer 4 — Scene prompt: per page (book `picturePrompt` / cover / closing).
 *
 * Brand consistency comes from Layer 1. Character identity comes from Layer 3.
 * Never cast one heroine by renaming another.
 *
 * The Studio Style is versioned: bump `ACTIVE_STUDIO_STYLE_VERSION` (or pin a
 * book's `studioStyleVersion`) and regenerate the library while the character
 * and world bibles stay fixed.
 */

import {
  CHARACTER_BIBLES,
  type CharacterBibleId,
  getCharacterBible,
} from "@/lib/children-books/characterBibles";
import {
  type FamilyCharacterId,
  getFamilyCharacter,
} from "@/lib/children-books/familyCast";
import {
  ACTIVE_STUDIO_STYLE_VERSION,
  getStudioStyle,
  STUDIO_STYLES,
  type StudioStyle,
  type StudioStyleVersion,
} from "@/lib/children-books/studioStyles";
import {
  type WorldBibleId,
  getWorldBible,
} from "@/lib/children-books/worldBibles";

export {
  ACTIVE_STUDIO_STYLE_VERSION,
  getStudioStyle,
  STUDIO_STYLES,
  type StudioStyle,
  type StudioStyleVersion,
};

/** Default series heroine id when a book does not specify a casting. */
export const LILLY_HERO_NAME = "Lilly";

const activeStudioStyle = getStudioStyle();

/**
 * Layer 1 — Studio Style (active version).
 * Visual language of every Lilly Storybooks illustration.
 */
export const LILLY_STUDIO_STYLE = activeStudioStyle.studioStyle;

/** Short lead paragraph prepended to every generation request (active version). */
export const LILLY_MASTER_PROMPT = activeStudioStyle.masterPrompt;

/** Things to always avoid (active version). */
export const LILLY_NEGATIVE_PROMPT = activeStudioStyle.negativePrompt;

/** @deprecated Prefer LILLY_STUDIO_STYLE — kept for tests and older references. */
export const LILLY_STORYBOOK_ART_BIBLE = LILLY_STUDIO_STYLE;

/** @deprecated Prefer LILLY_STUDIO_STYLE. */
export const LILLY_STORYBOOK_STYLE_GUIDE = LILLY_STUDIO_STYLE;

/** @deprecated Prefer CHARACTER_BIBLES.lilly — kept for tests. */
export const LILLY_CHARACTER_MODEL_SHEET = CHARACTER_BIBLES.lilly.sheet;

export type LillyPromptLayers = {
  characterId?: CharacterBibleId | string;
  worldId?: WorldBibleId | string;
  /** Display name override; defaults to character bible name. */
  heroName?: string;
  /** Studio Style version; defaults to the active version. */
  styleVersion?: StudioStyleVersion | string;
  /**
   * Supporting family cast to anchor in this book (Tish, Andrew, Winston).
   * Their approved model sheets are the canonical reference; their bible text is
   * appended so scenes keep each character identical across the series.
   */
  castIds?: (FamilyCharacterId | string)[];
};

/** Compose the supporting-cast anchor block, or "" when no cast is requested. */
function buildCastBlock(castIds?: (FamilyCharacterId | string)[]): string {
  const members = (castIds ?? [])
    .map((id) => getFamilyCharacter(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  if (members.length === 0) return "";

  return [
    "",
    "SUPPORTING CAST FOR THIS BOOK (match each approved model sheet exactly)",
    "These are permanent recurring characters — keep face, hair, proportions, and silhouette identical to their model sheets. Do not redesign them.",
    ...members.flatMap((c) => ["", c.sheet]),
  ].join("\n");
}

/**
 * Compose Layers 1–3 for a book. Scene text (Layer 4) is appended by illustrationPrompt.
 */
export function buildLillySystemPrompt(layers?: LillyPromptLayers | string): string {
  const opts: LillyPromptLayers =
    typeof layers === "string" ? { heroName: layers, characterId: "lilly" } : layers ?? {};

  const style = getStudioStyle(opts.styleVersion);
  const character = getCharacterBible(opts.characterId);
  const world = getWorldBible(opts.worldId);
  const heroLabel = opts.heroName?.trim() || character.name;
  const castBlock = buildCastBlock(opts.castIds);

  return [
    style.masterPrompt,
    "",
    style.studioStyle,
    "",
    world.sheet,
    "",
    `HEROINE FOR THIS BOOK: ${heroLabel}`,
    character.sheet,
    ...(castBlock ? [castBlock] : []),
    "",
    "CASTING RULE",
    "Treat this as casting a unique heroine — not dressing one generic girl in new clothes.",
    "She must be recognizable by silhouette alone. Do not borrow another heroine's face, hair, eyes, or body language.",
  ].join("\n");
}

/** Negative prompt for a given studio style version (defaults to active). */
export function negativePromptForStyle(version?: StudioStyleVersion | string): string {
  return getStudioStyle(version).negativePrompt;
}
