/**
 * Pre-generation validation (Section 15).
 *
 * Fails fast BEFORE spending an OpenAI call when the request cannot produce an
 * on-model image: a present recurring character has no approved reference, no
 * studio-style anchor was supplied, or the scene text still contains a forbidden
 * term (e.g. "golden hour", "long flowing Lilly hair"). The forbidden-term check
 * runs on the scene text only — never on the composed prompt, which legitimately
 * lists forbidden terms inside its negative/exclusions blocks.
 */

import {
  missingCharacterReferences,
  type ResolvedReferenceImage,
  type StorybookCharacterId,
} from "@/lib/children-books/characterReferenceAssets";
import { findForbiddenSceneTerms } from "@/lib/children-books/scenePromptSanitizer";

export type GenerationValidationInput = {
  /** Localized + sanitized Layer-4 scene text (NOT the full composed prompt). */
  sceneText: string;
  heroName?: string;
  /** Recurring characters expected in the scene. */
  presentCharacterIds: StorybookCharacterId[];
  /** References resolved for the scene (studio anchor + characters). */
  resolvedReferences: ResolvedReferenceImage[];
};

export type GenerationValidationResult = {
  ok: boolean;
  errors: string[];
};

export function validateGenerationRequest(
  input: GenerationValidationInput,
): GenerationValidationResult {
  const errors: string[] = [];

  const hasStudioAnchor = input.resolvedReferences.some(
    (r) => r.role === "studio-style",
  );
  if (!hasStudioAnchor) {
    errors.push("No studio-style anchor was supplied for this generation.");
  }

  const missing = missingCharacterReferences(input.presentCharacterIds);
  if (missing.length > 0) {
    errors.push(
      `Missing approved reference image(s) for: ${missing.join(", ")}. Approve and register them before generating.`,
    );
  }

  const forbidden = findForbiddenSceneTerms(input.sceneText, {
    heroName: input.heroName,
  });
  if (forbidden.length > 0) {
    errors.push(
      `Scene text still contains forbidden term(s): ${forbidden.join(", ")}.`,
    );
  }

  return { ok: errors.length === 0, errors };
}
