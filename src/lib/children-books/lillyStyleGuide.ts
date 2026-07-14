/**
 * Lilly Storybooks prompt layers — think like an animation studio.
 *
 * Layer 1 — Studio Style (this file): never changes across books.
 * Layer 2 — World Bible: per story (`worldBibles.ts`).
 * Layer 3 — Character Bible: per heroine (`characterBibles.ts`).
 * Layer 4 — Scene prompt: per page (book `picturePrompt` / cover / closing).
 *
 * Brand consistency comes from Layer 1. Character identity comes from Layer 3.
 * Never cast one heroine by renaming another.
 */

import {
  CHARACTER_BIBLES,
  type CharacterBibleId,
  getCharacterBible,
} from "@/lib/children-books/characterBibles";
import {
  type WorldBibleId,
  getWorldBible,
} from "@/lib/children-books/worldBibles";

/** Default series heroine id when a book does not specify a casting. */
export const LILLY_HERO_NAME = "Lilly";

/**
 * Layer 1 — Studio Style (Never Changes).
 * Visual language of every Lilly Storybooks illustration.
 */
export const LILLY_STUDIO_STYLE = `LAYER 1 — LILLY STORYBOOKS STUDIO STYLE (never changes)

Bright, airy palette with luminous whites and pastel skies.
Traditional hand-painted storybook illustration.
Clean, expressive ink linework.
Soft cel-style shading.
Watercolor / gouache backgrounds.
Rounded, expressive character construction.
Elegant, simplified anatomy.
Warm morning or golden-hour light.
Optimistic, joyful mood.
Large readable shapes.
Consistent page layouts.
Premium hardcover storybook aesthetic.

OVERALL FEEL
A timeless children's picture book parents keep for generations. Warm, hopeful, innocent, cozy, magical without flashiness, peaceful, joyful, simple. Designed for ages 3–7.

CHARACTER LANGUAGE (studio-wide — not one heroine's identity)
Stylized, never photorealistic. Large expressive eyes, simplified features, soft jawlines, youthful proportions. Hair as large painted shapes, never individual strands. Clothing suggested with flat color and soft shadow — not realistic fabric physics.

LINE ART
Clean illustration outlines, confident brush lines, slightly varying line weight, soft rounded edges. Avoid sketchy lines, comic outlines, painterly fuzzy edges, or AI edge noise.

LIGHTING
Soft, diffuse golden hour, window light, candle light, or morning light. Never dramatic movie lighting.

BACKGROUNDS
Painterly and simple. Support characters — do not compete. No clutter.

TEXTURE
Paper, watercolor, light gouache, soft brush strokes. No digital gloss, CGI materials, or hyper-detailed texture.

COMPOSITION
One clear story moment, one emotional focus. A child should understand the page in two seconds. Simple eye-level perspective. No dramatic camera angles.

EXPRESSIONS
Readable wonder, joy, curiosity, kindness, hope, gentleness. Avoid exaggerated comedy.

RENDERING
Flat enough to feel illustrated, enough shading for volume. Never cinematic, hyper-realistic, or movie-poster-like.

CHRISTIAN WORLDVIEW
Wonder from God's creation, love, kindness, prayer, community, and beauty. No magic spells, fairy dust, or fantasy creatures. Prayer is peaceful; miracles are reverent.`;

/** Short lead paragraph prepended to every generation request. */
export const LILLY_MASTER_PROMPT = `A timeless, hand-painted children's storybook illustration for a premium hardcover picture book in the Lilly Storybooks studio style. Stylized, rounded, expressive characters with clean ink linework, soft gouache and watercolor rendering, soft cel-style shading, warm optimistic lighting, large readable shapes, painterly backgrounds, and a premium hardcover storybook feel for ages 3–7. Avoid photorealism, CGI, modern concept art, anime, comic-book styling, glossy rendering, or hyper-detailed textures.`;

/** @deprecated Prefer LILLY_STUDIO_STYLE — kept for tests and older references. */
export const LILLY_STORYBOOK_ART_BIBLE = LILLY_STUDIO_STYLE;

/** @deprecated Prefer LILLY_STUDIO_STYLE. */
export const LILLY_STORYBOOK_STYLE_GUIDE = LILLY_STUDIO_STYLE;

/** @deprecated Prefer CHARACTER_BIBLES.lilly — kept for tests. */
export const LILLY_CHARACTER_MODEL_SHEET = CHARACTER_BIBLES.lilly.sheet;

export const LILLY_NEGATIVE_PROMPT = `Always avoid:
photorealism, CGI, Pixar look, Disney character designs, anime, manga, 3D rendering, Unreal Engine, concept art,
cinematic lighting, HDR, lens flare, dramatic depth of field, hyper-detailed skin, pores, individual hair strands,
plastic textures, AI artifacts, glossy surfaces, modern digital painting, excessive texture, sharp realism,
sketchy lines, comic-book outlines, fuzzy AI edges, neon colors, movie-poster composition, dramatic camera angles,
text, watermarks, logos, distorted hands, extra fingers, blurry faces, duplicate people, cropped heads,
magic spells, fairy dust, wands, fantasy creatures, harsh black backgrounds, visual noise, cluttered compositions,
same face reused across different heroines, generic identical silhouettes, costume-only character differentiation.`;

export type LillyPromptLayers = {
  characterId?: CharacterBibleId | string;
  worldId?: WorldBibleId | string;
  /** Display name override; defaults to character bible name. */
  heroName?: string;
};

/**
 * Compose Layers 1–3 for a book. Scene text (Layer 4) is appended by illustrationPrompt.
 */
export function buildLillySystemPrompt(layers?: LillyPromptLayers | string): string {
  const opts: LillyPromptLayers =
    typeof layers === "string" ? { heroName: layers, characterId: "lilly" } : layers ?? {};

  const character = getCharacterBible(opts.characterId);
  const world = getWorldBible(opts.worldId);
  const heroLabel = opts.heroName?.trim() || character.name;

  return [
    LILLY_MASTER_PROMPT,
    "",
    LILLY_STUDIO_STYLE,
    "",
    world.sheet,
    "",
    `HEROINE FOR THIS BOOK: ${heroLabel}`,
    character.sheet,
    "",
    "CASTING RULE",
    "Treat this as casting a unique heroine — not dressing one generic girl in new clothes.",
    "She must be recognizable by silhouette alone. Do not borrow another heroine's face, hair, eyes, or body language.",
  ].join("\n");
}
