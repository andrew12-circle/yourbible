import { supabase } from "@/integrations/supabase/client";
import {
  buildCoverGenerationRequest,
  buildPageGenerationRequest,
  type StorybookGenerationRequest,
} from "@/lib/children-books/generationRequest";
import {
  setStoredCoverImageUrl,
  setStoredPageImageUrl,
} from "@/lib/children-books/pageImages";
import type { ChildrenBook, ChildrenBookPage } from "@/lib/children-books/storybook";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

export type GeneratePageIllustrationInput = {
  book: ChildrenBook;
  page: ChildrenBookPage;
  pageNumber: number;
  force?: boolean;
};

export type GenerateCoverIllustrationInput = {
  book: ChildrenBook;
  force?: boolean;
};

export type GeneratePageIllustrationResult = {
  imageUrl: string;
  cached: boolean;
};

type EdgeResponse = {
  image_url?: string;
  cached?: boolean;
  error?: string;
};

/** Shared request body for the reference-image generation edge function. */
function edgeBody(request: StorybookGenerationRequest, force: boolean) {
  return {
    book_slug: request.bookSlug,
    image_kind: request.imageKind,
    page_number: request.pageNumber,
    prompt: request.prompt,
    reference_images: request.referenceImages,
    present_character_ids: request.presentCharacterIds,
    version_metadata: request.versionMetadata,
    force,
  };
}

function assertValid(request: StorybookGenerationRequest): void {
  if (!request.validation.ok) {
    throw new Error(
      `Cannot generate: ${request.validation.errors.join(" ")}`,
    );
  }
}

async function invokeIllustrate(
  request: StorybookGenerationRequest,
  force: boolean,
): Promise<GeneratePageIllustrationResult> {
  const { data, error } = await supabase.functions.invoke<EdgeResponse>(
    "children-book-illustrate",
    { body: edgeBody(request, force) },
  );

  if (error) {
    throw new Error(await edgeFunctionErrorMessage("children-book-illustrate", error, data));
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.image_url?.trim()) throw new Error("Illustration generation returned no image URL");

  return { imageUrl: data.image_url.trim(), cached: data.cached === true };
}

export async function generatePageIllustration(
  input: GeneratePageIllustrationInput,
): Promise<GeneratePageIllustrationResult> {
  const request = buildPageGenerationRequest(input.book, input.page, input.pageNumber);
  assertValid(request);

  const result = await invokeIllustrate(request, input.force ?? false);
  setStoredPageImageUrl(input.book.slug, input.pageNumber, result.imageUrl);
  return result;
}

export async function generateCoverIllustration(
  input: GenerateCoverIllustrationInput,
): Promise<GeneratePageIllustrationResult> {
  const request = buildCoverGenerationRequest(input.book);
  assertValid(request);

  const result = await invokeIllustrate(request, input.force ?? false);
  setStoredCoverImageUrl(input.book.slug, result.imageUrl);
  return result;
}
