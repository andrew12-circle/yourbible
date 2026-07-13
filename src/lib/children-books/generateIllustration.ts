import { supabase } from "@/integrations/supabase/client";
import {
  buildCoverIllustrationPrompt,
  buildPageIllustrationPrompt,
} from "@/lib/children-books/illustrationPrompt";
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

export async function generatePageIllustration(
  input: GeneratePageIllustrationInput,
): Promise<GeneratePageIllustrationResult> {
  const prompt = buildPageIllustrationPrompt({
    book: input.book,
    page: input.page,
    pageNumber: input.pageNumber,
  });

  const { data, error } = await supabase.functions.invoke<{
    image_url?: string;
    cached?: boolean;
    error?: string;
  }>("children-book-illustrate", {
    body: {
      book_slug: input.book.slug,
      page_number: input.pageNumber,
      prompt,
      force: input.force ?? false,
    },
  });

  if (error) {
    throw new Error(await edgeFunctionErrorMessage("children-book-illustrate", error, data));
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.image_url?.trim()) throw new Error("Illustration generation returned no image URL");

  const imageUrl = data.image_url.trim();
  setStoredPageImageUrl(input.book.slug, input.pageNumber, imageUrl);

  return { imageUrl, cached: data.cached === true };
}

export async function generateCoverIllustration(
  input: GenerateCoverIllustrationInput,
): Promise<GeneratePageIllustrationResult> {
  const prompt = buildCoverIllustrationPrompt(input.book);

  const { data, error } = await supabase.functions.invoke<{
    image_url?: string;
    cached?: boolean;
    error?: string;
  }>("children-book-illustrate", {
    body: {
      book_slug: input.book.slug,
      image_kind: "cover",
      prompt,
      force: input.force ?? false,
    },
  });

  if (error) {
    throw new Error(await edgeFunctionErrorMessage("children-book-illustrate", error, data));
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.image_url?.trim()) throw new Error("Cover generation returned no image URL");

  const imageUrl = data.image_url.trim();
  setStoredCoverImageUrl(input.book.slug, imageUrl);

  return { imageUrl, cached: data.cached === true };
}
