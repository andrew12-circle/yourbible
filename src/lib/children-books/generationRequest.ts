/**
 * Assemble a complete image-generation request for a book page / cover / closing.
 *
 * One place composes everything the pipeline needs so the client (edge call) and
 * the batch script stay identical:
 *   • the composed prompt (Section 12 order, reference-image instructions),
 *   • the ordered approved reference images to attach (studio anchor + characters),
 *   • the version metadata used to build the cache-busting fingerprint,
 *   • the present recurring characters, and
 *   • the pre-generation validation result (Section 15).
 */

import {
  resolvedCharacterVersion,
  type ResolvedReferenceImage,
  type StorybookCharacterId,
} from "@/lib/children-books/characterReferenceAssets";
import { PROMPT_VERSION, type StorybookImageKind } from "@/lib/children-books/generationFingerprint";
import {
  validateGenerationRequest,
  type GenerationValidationResult,
} from "@/lib/children-books/generationValidation";
import {
  buildClosingIllustrationPrompt,
  buildCoverIllustrationPrompt,
  buildPageIllustrationPrompt,
  presentCharacterIdsForBook,
  presentCharacterIdsForPage,
  resolveBookReferenceImages,
  resolvePageReferenceImages,
  sceneTextFor,
} from "@/lib/children-books/illustrationPrompt";
import { LILLY_HERO_NAME } from "@/lib/children-books/lillyStyleGuide";
import { SANITIZER_VERSION } from "@/lib/children-books/scenePromptSanitizer";
import { ACTIVE_STUDIO_STYLE_VERSION } from "@/lib/children-books/studioStyles";
import type { ChildrenBook, ChildrenBookPage } from "@/lib/children-books/storybook";
import { WORLD_BIBLE_PROMPT_VERSION } from "@/lib/children-books/worldBibles";

export type GenerationVersionMetadata = {
  studioStyleVersion: string;
  worldBibleVersion: string;
  promptVersion: string;
  sanitizerVersion: string;
  /** Approved reference versions actually used (keyed by id + "studio"). */
  characterReferenceVersions: Record<string, string>;
};

export type StorybookGenerationRequest = {
  bookSlug: string;
  imageKind: StorybookImageKind;
  pageNumber?: number;
  prompt: string;
  referenceImages: ResolvedReferenceImage[];
  presentCharacterIds: StorybookCharacterId[];
  sceneText: string;
  versionMetadata: GenerationVersionMetadata;
  validation: GenerationValidationResult;
};

function versionMetadataFor(
  book: ChildrenBook,
  references: ResolvedReferenceImage[],
  present: StorybookCharacterId[],
): GenerationVersionMetadata {
  const characterReferenceVersions: Record<string, string> = {};
  for (const ref of references) {
    if (ref.role === "studio-style") characterReferenceVersions.studio = ref.version;
  }
  // Record every present character's approved version even when several dedup to
  // one shared plate (the family sheet), so a character version bump still busts
  // the cache via the generation fingerprint.
  for (const id of present) {
    characterReferenceVersions[id] = resolvedCharacterVersion(id, book.characterReferenceVersions);
  }
  return {
    studioStyleVersion: book.studioStyleVersion ?? ACTIVE_STUDIO_STYLE_VERSION,
    worldBibleVersion: WORLD_BIBLE_PROMPT_VERSION,
    promptVersion: PROMPT_VERSION,
    sanitizerVersion: SANITIZER_VERSION,
    characterReferenceVersions,
  };
}

function heroName(book: ChildrenBook): string {
  return book.heroName?.trim() || LILLY_HERO_NAME;
}

export function buildPageGenerationRequest(
  book: ChildrenBook,
  page: ChildrenBookPage,
  pageNumber: number,
): StorybookGenerationRequest {
  const present = presentCharacterIdsForPage(book, page);
  const referenceImages = resolvePageReferenceImages(book, page);
  const sceneText = sceneTextFor(book, page.picturePrompt);
  return {
    bookSlug: book.slug,
    imageKind: "page",
    pageNumber,
    prompt: buildPageIllustrationPrompt({ book, page, pageNumber }),
    referenceImages,
    presentCharacterIds: present,
    sceneText,
    versionMetadata: versionMetadataFor(book, referenceImages, present),
    validation: validateGenerationRequest({
      sceneText,
      heroName: heroName(book),
      presentCharacterIds: present,
      resolvedReferences: referenceImages,
    }),
  };
}

export function buildCoverGenerationRequest(book: ChildrenBook): StorybookGenerationRequest {
  const present = presentCharacterIdsForBook(book);
  const referenceImages = resolveBookReferenceImages(book);
  const sceneText = sceneTextFor(book, book.coverPrompt);
  return {
    bookSlug: book.slug,
    imageKind: "cover",
    prompt: buildCoverIllustrationPrompt(book),
    referenceImages,
    presentCharacterIds: present,
    sceneText,
    versionMetadata: versionMetadataFor(book, referenceImages, present),
    validation: validateGenerationRequest({
      sceneText,
      heroName: heroName(book),
      presentCharacterIds: present,
      resolvedReferences: referenceImages,
    }),
  };
}

export function buildClosingGenerationRequest(book: ChildrenBook): StorybookGenerationRequest {
  const present = presentCharacterIdsForBook(book);
  const referenceImages = resolveBookReferenceImages(book);
  const sceneText = sceneTextFor(book, book.closingIllustrationPrompt);
  return {
    bookSlug: book.slug,
    imageKind: "closing",
    prompt: buildClosingIllustrationPrompt(book),
    referenceImages,
    presentCharacterIds: present,
    sceneText,
    versionMetadata: versionMetadataFor(book, referenceImages, present),
    validation: validateGenerationRequest({
      sceneText,
      heroName: heroName(book),
      presentCharacterIds: present,
      resolvedReferences: referenceImages,
    }),
  };
}
