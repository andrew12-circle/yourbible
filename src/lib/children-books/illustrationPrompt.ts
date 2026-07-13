import type { ChildrenBook, ChildrenBookPage } from "@/lib/children-books/storybook";
import {
  buildLillySystemPrompt,
  LILLY_HERO_NAME,
  LILLY_NEGATIVE_PROMPT,
} from "@/lib/children-books/lillyStyleGuide";

export const STORYBOOK_ILLUSTRATION_SYSTEM_PROMPT = buildLillySystemPrompt();

export const STORYBOOK_ILLUSTRATION_NEGATIVE_PROMPT = LILLY_NEGATIVE_PROMPT;

const paletteGuidance: Record<ChildrenBookPage["palette"], string> = {
  dawn: "Warm cream, golden sunlight, soft sunrise, dusty rose accents.",
  garden: "Sage green, wildflowers, rolling hills, warm brown, soft blue.",
  royal: "Muted navy accents, golden sunlight, lavender, rich wood tones, soft ivory.",
  starlight: "Soft blue, soft ivory, gentle moonlight, dusty rose, peaceful night.",
};

export type PageIllustrationPromptInput = {
  book: ChildrenBook;
  page: ChildrenBookPage;
  pageNumber: number;
};

function systemPromptForBook(book: ChildrenBook): string {
  return buildLillySystemPrompt(book.heroName?.trim() || LILLY_HERO_NAME, {
    bookArtDirection: book.artDirectionPrompt,
    heroModelSheet: book.heroModelSheet,
  });
}

/** Align scene text with the book's heroine name when retelling classic stories. */
export function localizeScenePrompt(book: ChildrenBook, scene: string): string {
  const name = book.heroName?.trim();
  if (!name) return scene;
  return scene.replace(/\bCinderella\b/g, name);
}

export function buildPageIllustrationPrompt({
  book,
  page,
  pageNumber,
}: PageIllustrationPromptInput): string {
  return [
    systemPromptForBook(book),
    "",
    "BOOK CONTEXT",
    `Book: ${book.title}`,
    `Page ${pageNumber}: ${page.title}`,
    `Age range: ${book.ageRange}`,
    `Spiritual focus: ${book.spiritualFocus}`,
    `Emotional emphasis: ${page.scriptureThread}`,
    `Palette guidance: ${paletteGuidance[page.palette]}`,
    "",
    "SCENE TO ILLUSTRATE",
    localizeScenePrompt(book, page.picturePrompt),
    "",
    "NEGATIVE PROMPT",
    STORYBOOK_ILLUSTRATION_NEGATIVE_PROMPT,
  ].join("\n");
}

export function buildCoverIllustrationPrompt(book: ChildrenBook): string {
  return [
    systemPromptForBook(book),
    "",
    "BOOK CONTEXT",
    `Book: ${book.title}`,
    "Front cover illustration",
    `Age range: ${book.ageRange}`,
    `Spiritual focus: ${book.spiritualFocus}`,
    `Summary: ${book.summary}`,
    "",
    "COVER COMPOSITION",
    "Premium Lilly storybook front cover, portrait orientation.",
    "Leave gentle open space along the top third for a title overlay.",
    "No text, letters, logos, or watermarks in the artwork.",
    "Warm, inviting, classic hardcover storybook feel.",
    "",
    "SCENE TO ILLUSTRATE",
    localizeScenePrompt(book, book.coverPrompt),
    "",
    "NEGATIVE PROMPT",
    STORYBOOK_ILLUSTRATION_NEGATIVE_PROMPT,
    "text, title lettering, author name, publisher logo, barcode, spine text.",
  ].join("\n");
}

export function buildClosingIllustrationPrompt(book: ChildrenBook): string {
  return [
    systemPromptForBook(book),
    "",
    "BOOK CONTEXT",
    `Book: ${book.title}`,
    "Closing spread illustration — peaceful, memorable storybook ending",
    `Age range: ${book.ageRange}`,
    `Spiritual focus: ${book.spiritualFocus}`,
    "",
    "CLOSING COMPOSITION",
    "Premium storybook ENDING illustration, portrait orientation.",
    "Soft golden hour or gentle starlight. Joyful peace, gratitude, and quiet wonder.",
    "Simple eye-level composition, cozy and magical without flashiness.",
    "No text in the artwork.",
    "",
    "SCENE TO ILLUSTRATE",
    localizeScenePrompt(book, book.closingIllustrationPrompt),
    "",
    "NEGATIVE PROMPT",
    STORYBOOK_ILLUSTRATION_NEGATIVE_PROMPT,
    "text, title lettering, author name, publisher logo.",
  ].join("\n");
}
