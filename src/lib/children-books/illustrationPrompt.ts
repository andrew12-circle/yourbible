import { CHARACTER_BIBLES, getCharacterBible } from "@/lib/children-books/characterBibles";
import {
  getCharacterReferenceAsset,
  isStorybookCharacterId,
  resolveSceneReferenceImages,
  studioAnchorCoveredCharacterIds,
  STUDIO_STYLE_ANCHOR,
  type ResolvedReferenceImage,
  type StorybookCharacterId,
} from "@/lib/children-books/characterReferenceAssets";
import { getFamilyCharacter } from "@/lib/children-books/familyCast";
import {
  buildLillySystemPrompt,
  getStudioStyle,
  LILLY_HERO_NAME,
  LILLY_NEGATIVE_PROMPT,
  negativePromptForStyle,
} from "@/lib/children-books/lillyStyleGuide";
import { sanitizeScenePrompt } from "@/lib/children-books/scenePromptSanitizer";
import type { ChildrenBook, ChildrenBookPage } from "@/lib/children-books/storybook";
import { getWorldBible } from "@/lib/children-books/worldBibles";

export const STORYBOOK_ILLUSTRATION_SYSTEM_PROMPT = buildLillySystemPrompt({
  characterId: "lilly",
  worldId: "european-kingdom",
  heroName: LILLY_HERO_NAME,
});

export const STORYBOOK_ILLUSTRATION_NEGATIVE_PROMPT = LILLY_NEGATIVE_PROMPT;

/** Negative prompt for the version this book is pinned to (defaults to active). */
function negativeForBook(book: ChildrenBook): string {
  return negativePromptForStyle(book.studioStyleVersion);
}

/** Section 10 — bright, high-key palette guidance (no amber/orange/sepia washes). */
const paletteGuidance: Record<ChildrenBookPage["palette"], string> = {
  dawn: "Clean pale-blue morning, porcelain white, soft blush, fresh green and minimal pale-gold accents. Neutral daylight. No orange sunrise wash, beige cast or amber haze.",
  garden:
    "Fresh spring green, pale sky blue, white flowers, lavender, blush and light stone. Keep soil and wood secondary. No brown-dominant atmosphere.",
  royal:
    "Porcelain-white or pale-stone architecture, clear blue accents, pale lavender, cool ivory and minimal clean gold trim. Keep the environment bright and predominantly pale.",
  starlight:
    "Pearl white, pale moon blue, lavender-gray and restrained dusty rose. Shadows remain cool and gentle, never black or brown.",
  coastal:
    "Crystal turquoise, clear blue, sea-glass green, porcelain highlights, pale coral and lavender. Water must feel luminous and clean, not dark teal or gold-filtered.",
  "home-daylight":
    "White walls, pale blue, soft blush, fresh green and clean natural wood used sparingly. Bright open-window daylight. No yellow kitchen cast.",
};

export type PageIllustrationPromptInput = {
  book: ChildrenBook;
  page: ChildrenBookPage;
  pageNumber: number;
};

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/** Heroine id as a StorybookCharacterId (defaults to Lilly). */
function heroCharacterId(book: ChildrenBook): StorybookCharacterId {
  const id = book.characterId ?? "lilly";
  return isStorybookCharacterId(id) ? id : "lilly";
}

/** Recurring characters that appear anywhere in the book. */
export function presentCharacterIdsForBook(book: ChildrenBook): StorybookCharacterId[] {
  if (book.characterIds?.length) return unique(book.characterIds);
  const ids: StorybookCharacterId[] = [heroCharacterId(book)];
  for (const c of book.castIds ?? []) if (isStorybookCharacterId(c)) ids.push(c);
  return unique(ids);
}

/** Recurring characters present on a specific page. */
export function presentCharacterIdsForPage(
  book: ChildrenBook,
  page: ChildrenBookPage,
): StorybookCharacterId[] {
  if (page.presentCharacterIds?.length) return unique(page.presentCharacterIds);
  return presentCharacterIdsForBook(book);
}

function resolveReferencesFor(
  book: ChildrenBook,
  present: StorybookCharacterId[],
): ResolvedReferenceImage[] {
  return resolveSceneReferenceImages({
    heroId: heroCharacterId(book),
    presentCharacterIds: present,
    characterReferenceVersions: book.characterReferenceVersions,
  });
}

export function resolvePageReferenceImages(
  book: ChildrenBook,
  page: ChildrenBookPage,
): ResolvedReferenceImage[] {
  return resolveReferencesFor(book, presentCharacterIdsForPage(book, page));
}

export function resolveBookReferenceImages(book: ChildrenBook): ResolvedReferenceImage[] {
  return resolveReferencesFor(book, presentCharacterIdsForBook(book));
}

/** LAYER 0 — instructions that tell the model how to use the supplied images. */
function referenceInstructionsBlock(
  refs: ResolvedReferenceImage[],
  present: StorybookCharacterId[],
): string {
  const lines = [
    "LAYER 0 — REFERENCE IMAGE INSTRUCTIONS (highest priority)",
    "REFERENCE PRIORITY:",
    "The supplied approved model sheets are authoritative for character identity.",
    "The supplied studio anchor is authoritative for illustration language.",
    "Do not redesign any referenced character.",
    "Text descriptions clarify the references but do not replace them.",
    "Use each supplied character model sheet only as the identity reference for that named character.",
    "Create a completely new story scene.",
    "Do not reproduce the model-sheet layout, labels, poses, white background, palette strip, or typography.",
    "Preserve facial identity, apparent age, hair length, hairline, eye shape, body proportions, silhouette, and species markings.",
    "",
    "SUPPLIED REFERENCE IMAGES (in upload order):",
  ];
  // Characters whose identity lives ON the shared studio-anchor plate and are
  // present in this scene. The anchor then doubles as their identity reference.
  const coveredIds = studioAnchorCoveredCharacterIds();
  const anchorIdentities = present.filter((id) => coveredIds.includes(id));

  refs.forEach((ref, index) => {
    const n = index + 1;
    if (ref.role === "studio-style") {
      if (anchorIdentities.length > 0) {
        const names = anchorIdentities
          .map((id) => getCharacterReferenceAsset(id)?.displayName ?? id)
          .join(", ");
        lines.push(
          `Image ${n} — STUDIO STYLE + IDENTITY ANCHOR (${ref.version}): this approved plate defines the illustration language (linework, cel shading, palette) AND is the authoritative identity reference for ${names}. Preserve their faces, apparent age, hair length, and proportions. Create a NEW scene — do not reproduce the sheet layout, labels, poses, white background, or palette strip.`,
        );
      } else {
        lines.push(
          `Image ${n} — STUDIO STYLE ANCHOR (${ref.version}): use only for illustration language, palette, linework, and rendering. Do not copy its characters, layout, or palette strip into the scene.`,
        );
      }
      return;
    }
    // A shared plate (the family model sheet) can carry several present
    // characters. Name every present character whose identity lives on this
    // exact image so none of them is silently hidden under one name.
    const sharedIds = present.filter(
      (id) => getCharacterReferenceAsset(id)?.referenceImagePaths[0] === ref.path,
    );
    const ids = sharedIds.length > 0 ? sharedIds : ref.characterId ? [ref.characterId] : [];
    if (ids.length > 1) {
      const names = ids.map((id) => getCharacterReferenceAsset(id)?.displayName ?? id).join(", ");
      const rules = ids
        .map((id) => {
          const a = getCharacterReferenceAsset(id);
          return `${a?.displayName ?? id}: ${a?.requiredIdentityRules ?? ""}`;
        })
        .join(" ");
      lines.push(
        `Image ${n} — ${names.toUpperCase()} IDENTITY (${ref.version}): this approved plate shows them together; keep each one on-model. ${rules}`,
      );
      return;
    }
    const soleId = ids[0];
    const asset = soleId ? getCharacterReferenceAsset(soleId) : undefined;
    const name = asset?.displayName ?? soleId ?? "character";
    const rules = asset?.requiredIdentityRules ?? "";
    lines.push(`Image ${n} — ${name.toUpperCase()} IDENTITY (${ref.version}): ${rules}`);
  });
  return lines.join("\n");
}

/** LAYER 3 — full identity bibles for every present recurring character. */
function identityLockBlock(
  book: ChildrenBook,
  present: StorybookCharacterId[],
): string {
  const heroId = heroCharacterId(book);
  const parts: string[] = [
    "IDENTITY LOCK (match each approved reference exactly — costume may change, identity may not)",
    "",
    getCharacterBible(heroId).sheet,
  ];
  for (const id of present) {
    if (id === heroId) continue;
    if (id in CHARACTER_BIBLES) {
      parts.push("", getCharacterBible(id).sheet);
      continue;
    }
    const fam = getFamilyCharacter(id);
    if (fam) parts.push("", fam.sheet);
  }
  return parts.join("\n");
}

function requiredCharactersBlock(present: StorybookCharacterId[]): string {
  const names = present.map((id) => getCharacterReferenceAsset(id)?.displayName ?? id);
  return [
    "REQUIRED CHARACTERS (this scene)",
    names.length
      ? `Include and keep on-model: ${names.join(", ")}. Do not substitute, duplicate, or redesign any of them.`
      : "No recurring cast on this page.",
  ].join("\n");
}

function finalValidationBlock(heroName: string): string {
  const heroLine =
    heroName.trim().toLowerCase() === "lilly"
      ? "Lilly has short ear-to-jaw-length curls, "
      : "";
  return [
    "FINAL VALIDATION:",
    `Before producing the image, verify that each referenced person is recognizable as the approved character, ${heroLine}all heads are age-proportionate, whites remain white, characters use clean animation-style rendering, backgrounds remain soft and subordinate, and there is no amber, beige, sepia, or orange wash.`,
  ].join("\n");
}

/**
 * Align classic retelling names in scene text with the book's heroine when needed.
 * Prefer writing scenes with the heroine's real name; this is a safety net.
 */
export function localizeScenePrompt(book: ChildrenBook, scene: string): string {
  const name = book.heroName?.trim();
  if (!name) return scene;

  let next = scene;
  if (name === "Lilly") {
    next = next.replace(/\bCinderella\b/g, name);
  }
  return next;
}

/** Localized + sanitized Layer-4 scene text (used for the prompt and validation). */
export function sceneTextFor(book: ChildrenBook, scene: string): string {
  return sanitizeScenePrompt(localizeScenePrompt(book, scene), {
    heroName: book.heroName?.trim() || LILLY_HERO_NAME,
  });
}

type ComposeInput = {
  book: ChildrenBook;
  present: StorybookCharacterId[];
  references: ResolvedReferenceImage[];
  sceneHeader: string;
  sceneHeaderNote: string;
  contextLines: string[];
  sceneText: string;
  compositionLines: string[];
  paletteLine: string;
  extraNegative?: string[];
};

/**
 * Swap trademarked proper nouns for neutral stand-ins in the FINAL composed
 * prompt only. The reader-facing book text keeps its real names; the image
 * model (which refuses to depict protected franchise characters by name) never
 * sees them. Literal, case-sensitive, all-occurrences substitution.
 */
function applyPromptSafeReplacements(
  prompt: string,
  replacements?: ChildrenBook["promptSafeReplacements"],
): string {
  if (!replacements?.length) return prompt;
  let next = prompt;
  for (const { find, replace } of replacements) {
    if (!find) continue;
    next = next.split(find).join(replace);
  }
  return next;
}

/** Section 12 — compose the prompt in the exact required priority order. */
function composeIllustrationPrompt(input: ComposeInput): string {
  const { book } = input;
  const style = getStudioStyle(book.studioStyleVersion);
  const world = getWorldBible(book.worldId);
  const heroName = book.heroName?.trim() || LILLY_HERO_NAME;

  const composed = [
    style.masterPrompt,
    "",
    referenceInstructionsBlock(input.references, input.present),
    "",
    identityLockBlock(book, input.present),
    "",
    style.studioStyle,
    "",
    requiredCharactersBlock(input.present),
    "",
    world.sheet,
    "",
    input.sceneHeader,
    input.sceneHeaderNote,
    "",
    "BOOK CONTEXT",
    ...input.contextLines,
    "",
    ...(book.supportingCastPrompt?.trim() ? [book.supportingCastPrompt.trim(), ""] : []),
    "SCENE",
    input.sceneText,
    "",
    "COMPOSITION",
    ...input.compositionLines,
    "",
    "PALETTE",
    input.paletteLine,
    "",
    "EXCLUSIONS / NEGATIVE PROMPT",
    negativeForBook(book),
    ...(input.extraNegative ?? []),
    "",
    finalValidationBlock(heroName),
  ].join("\n");

  return applyPromptSafeReplacements(composed, book.promptSafeReplacements);
}

export function buildPageIllustrationPrompt({
  book,
  page,
  pageNumber,
}: PageIllustrationPromptInput): string {
  const present = presentCharacterIdsForPage(book, page);
  return composeIllustrationPrompt({
    book,
    present,
    references: resolveReferencesFor(book, present),
    sceneHeader: "LAYER 4 — SCENE TO ILLUSTRATE (this page only)",
    sceneHeaderNote:
      "Describe only what is happening on this page. Do not redesign any character or change the studio style.",
    contextLines: [
      `Book: ${book.title}`,
      `Page ${pageNumber}: ${page.title}`,
      `Age range: ${book.ageRange}`,
      `Spiritual focus: ${book.spiritualFocus}`,
      `Emotional emphasis: ${page.scriptureThread}`,
    ],
    sceneText: sceneTextFor(book, page.picturePrompt),
    compositionLines: [
      "One clear story action, one emotional focus, simple eye-level staging.",
      "Strong readable silhouettes with intentional pale open space (no poster collage, no wall-to-wall detail).",
    ],
    paletteLine: paletteGuidance[page.palette],
  });
}

export function buildCoverIllustrationPrompt(book: ChildrenBook): string {
  const present = presentCharacterIdsForBook(book);
  return composeIllustrationPrompt({
    book,
    present,
    references: resolveReferencesFor(book, present),
    sceneHeader: "LAYER 4 — SCENE TO ILLUSTRATE (cover only)",
    sceneHeaderNote: "Describe only the cover moment. Keep studio style and identity fixed.",
    contextLines: [
      `Book: ${book.title}`,
      "Front cover illustration",
      `Age range: ${book.ageRange}`,
      `Spiritual focus: ${book.spiritualFocus}`,
      `Summary: ${book.summary}`,
    ],
    sceneText: sceneTextFor(book, book.coverPrompt),
    compositionLines: [
      "Premium Lilly storybook front cover, portrait orientation.",
      "Leave gentle open space along the top third for a title overlay.",
      "Bright, inviting, classic hardcover storybook feel in clean, luminous color.",
      "No text, letters, logos, or watermarks in the artwork.",
    ],
    paletteLine:
      "Bright, clean, luminous high-key palette — porcelain white, pale sky blue, and fresh accents. No amber, orange, or golden wash.",
    extraNegative: ["text, title lettering, author name, publisher logo, barcode, spine text."],
  });
}

export function buildClosingIllustrationPrompt(book: ChildrenBook): string {
  const present = presentCharacterIdsForBook(book);
  return composeIllustrationPrompt({
    book,
    present,
    references: resolveReferencesFor(book, present),
    sceneHeader: "LAYER 4 — SCENE TO ILLUSTRATE (closing only)",
    sceneHeaderNote: "Describe only the ending moment. Keep studio style and identity fixed.",
    contextLines: [
      `Book: ${book.title}`,
      "Closing spread illustration — peaceful, memorable storybook ending",
      `Age range: ${book.ageRange}`,
      `Spiritual focus: ${book.spiritualFocus}`,
    ],
    sceneText: sceneTextFor(book, book.closingIllustrationPrompt),
    compositionLines: [
      "Premium storybook ENDING illustration, portrait orientation.",
      "Soft, bright morning daylight or gentle clear starlight. Joyful peace, gratitude, and quiet wonder.",
      "Simple eye-level composition, cozy and wholesome without flashiness.",
      "No text in the artwork.",
    ],
    paletteLine:
      "Bright, gentle, high-key palette with cool soft shadows. No amber, orange, sepia, or golden wash.",
    extraNegative: ["text, title lettering, author name, publisher logo."],
  });
}
