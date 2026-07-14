/**
 * Character Model Creation System — the "actor" before any story.
 *
 * This is NOT a story illustration. It produces the permanent studio model
 * sheet for a Lilly Storybooks character that every future illustration must
 * match. Identity and consistency are the highest priority.
 *
 * One master model sheet is generated per character (Lilly, Tish, Andrew,
 * Winston). Each approved sheet is stored as a reference asset under
 * public/children-books/character-bibles/<id>/model-sheet.png and its bible
 * text (identity anchor) is included in every illustration prompt.
 */

import { CHARACTER_BIBLES } from "@/lib/children-books/characterBibles";
import { FAMILY_CHARACTERS } from "@/lib/children-books/familyCast";
import {
  getStudioStyle,
  type StudioStyle,
  type StudioStyleVersion,
} from "@/lib/children-books/studioStyles";

export type ModelCharacterKind = "child" | "adult" | "animal";

export type ModelCharacter = {
  id: string;
  name: string;
  kind: ModelCharacterKind;
  /** Character bible text (identity anchor). */
  sheet: string;
  /** Approved master model sheet asset path under public/. */
  modelSheetPath: string;
};

const LILLY_MODEL: ModelCharacter = {
  id: "lilly",
  name: CHARACTER_BIBLES.lilly.name,
  kind: "child",
  sheet: CHARACTER_BIBLES.lilly.sheet,
  modelSheetPath: "children-books/character-bibles/lilly/model-sheet.png",
};

/** The permanent core cast that gets a master model sheet. */
export const CORE_CAST: ModelCharacter[] = [
  LILLY_MODEL,
  ...Object.values(FAMILY_CHARACTERS).map(
    (c): ModelCharacter => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      sheet: c.sheet,
      modelSheetPath: c.modelSheetPath,
    }),
  ),
];

export function getModelCharacter(id: string): ModelCharacter | undefined {
  return CORE_CAST.find((c) => c.id === id);
}

/**
 * The creation-system brief shared by every master model sheet.
 * Faithful to the Lilly Storybooks Character Model Creation System.
 */
const CREATION_SYSTEM_BRIEF = `LILLY STORYBOOKS — CHARACTER MODEL CREATION SYSTEM

PURPOSE
Create the official, permanent studio character model for the Lilly Storybooks universe. This is NOT a story illustration, concept art, or a poster. It is the master reference every future illustration must match exactly. Character identity is more important than artistic flair; consistency is the highest priority. Treat this like the permanent model sheet for the lead of a feature-length animated storybook series.

DESIGN PHILOSOPHY
The character should feel like a real person illustrated beautifully — never cartoonishly exaggerated, doll-like, baby-proportioned, or chibi. A reader should immediately recognize this same "actor" from page to page.

PROPORTIONS
Age-appropriate and believable. Children about 6½–7 heads tall with a visible neck, natural shoulders, hands, and legs, and graceful movement — never toddler proportions. Adults have natural, graceful proportions.

FACIAL PROPORTIONS
Use the supplied reference photographs as the highest priority. Capture face shape, jawline, smile, eyes, eyebrows, nose, hairline, cheek shape, and expression. Resemble the real person while remaining stylized — interpret into the Lilly Storybooks illustration language; never copy a photograph literally.

EYES: medium-large, almond-shaped, visible eyelids, warm expression — never oversized, anime, or doll eyes.
NOSE: small, natural, with a visible bridge and a soft rounded tip — never a button nose.
MOUTH: a natural smile with realistic proportions, slight dimples if present, simplified teeth — never exaggerated.
HAIR: match the reference for length, part, curl pattern, volume, and natural movement. Paint hair in large flowing shapes — never individual strands, fluffy AI curls, or random restyles.
SKIN: natural skin tone with soft watercolor blush — never plastic or airbrushed.

LIGHTING & BACKGROUND
Neutral, bright, soft, airy high-key daylight — no cinematic grading, no warm/tan/orange wash. Background is pure white or a very pale watercolor wash; the character is the sole focus.

CONSISTENCY RULES
Once approved, this becomes the permanent studio model. Future illustrations may change clothing, pose, lighting, environment, age-appropriate expression, and story context — but must NEVER change the face, hair, body proportions, eye shape, smile, silhouette, or overall identity. Every book must feel like the same beloved character.`;

function masterSheetHeader(character: ModelCharacter, style: StudioStyle): string {
  return [
    style.masterPrompt,
    "",
    style.studioStyle,
    "",
    CREATION_SYSTEM_BRIEF,
    "",
    `CHARACTER TO MODEL: ${character.name}`,
    character.sheet,
  ].join("\n");
}

function personSheetLayout(character: ModelCharacter): string[] {
  return [
    "MASTER MODEL SHEET LAYOUT — single professional landscape reference sheet",
    `Present the SAME ${character.name} in every panel. Do not invent a second face.`,
    "1) Full-body turnaround left to right: front, three-quarter, side profile, and back view — same primary outfit in all four.",
    "2) A row of head-and-shoulders expression studies: joy, wonder, prayer, thinking, gentle smile, excitement, curiosity, concern, hope, gratitude.",
    "3) A hair reference study (front and back of the hairstyle).",
    "4) Small studies of the hands and the shoes.",
    "5) Four to six canonical outfit variations as small full-body figures — identical face, hair, and proportions in each.",
    "6) An unlabeled color-palette strip: hair, eyes, skin, primary clothing, and accent colors.",
    "Even, neutral high-key daylight; pure white or very pale watercolor-wash background; large readable shapes.",
  ];
}

function animalSheetLayout(character: ModelCharacter): string[] {
  return [
    "MASTER MODEL SHEET LAYOUT — single professional landscape reference sheet",
    `Present the SAME ${character.name} in every panel, with identical markings. Do not invent a second animal.`,
    "1) Full-body poses left to right: sitting, standing, play bow, and walking — same dog in all four.",
    "2) A row of head studies from several angles.",
    "3) A coat-and-markings reference (the black saddle and tan points) painted as large wiry shapes.",
    "4) An unlabeled color-palette strip for coat and accent colors.",
    "Even, neutral high-key daylight; pure white or very pale watercolor-wash background; large readable shapes.",
  ];
}

export function buildMasterModelSheetPrompt(
  character: ModelCharacter,
  style: StudioStyle = getStudioStyle(),
): string {
  const layout = character.kind === "animal"
    ? animalSheetLayout(character)
    : personSheetLayout(character);

  return [
    masterSheetHeader(character, style),
    "",
    ...layout,
    "",
    "CHARACTER BIBLE ARTIFACT",
    "This is a model-sheet reference plate for casting consistency — not a story page.",
    "No text, letters, labels, numbers, arrows, charts, logos, or watermarks (labels are added later in the app).",
    "",
    "NEGATIVE PROMPT",
    style.negativePrompt,
    "text, labels, panel numbers, arrows, charts, a second different character, mismatched faces between panels.",
  ].join("\n");
}

export type MasterModelSheetJob = {
  characterId: string;
  /** Relative path under public/ */
  relativePath: string;
  prompt: string;
  styleVersion: StudioStyleVersion;
  size: "1536x1024" | "1024x1536";
};

export function listMasterModelSheetJobs(
  ids?: string[],
  styleVersion?: StudioStyleVersion | string,
): MasterModelSheetJob[] {
  const style = getStudioStyle(styleVersion);
  const selected = ids?.length
    ? CORE_CAST.filter((c) => ids.includes(c.id))
    : CORE_CAST;

  return selected.map((character) => ({
    characterId: character.id,
    relativePath: character.modelSheetPath,
    prompt: buildMasterModelSheetPrompt(character, style),
    styleVersion: style.version,
    size: "1536x1024",
  }));
}
