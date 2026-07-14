import type { ChildrenBook, ChildrenBookPage } from "@/lib/children-books/storybook";
import {
  buildLillySystemPrompt,
  LILLY_HERO_NAME,
  LILLY_NEGATIVE_PROMPT,
} from "@/lib/children-books/lillyStyleGuide";

export const STORYBOOK_ILLUSTRATION_SYSTEM_PROMPT = buildLillySystemPrompt({
  characterId: "lilly",
  worldId: "european-kingdom",
  heroName: LILLY_HERO_NAME,
});

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
  return buildLillySystemPrompt({
    characterId: book.characterId,
    worldId: book.worldId,
    heroName: book.heroName?.trim() || LILLY_HERO_NAME,
  });
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

/** Layers 1–3 + Layer 4 scene. */
export function buildPageIllustrationPrompt({
  book,
  page,
  pageNumber,
}: PageIllustrationPromptInput): string {
  return [
    systemPromptForBook(book),
    "",
    "LAYER 4 — SCENE TO ILLUSTRATE (this page only)",
    "Describe only what is happening on this page. Do not redesign the heroine or change the studio style.",
    "",
    "BOOK CONTEXT",
    `Book: ${book.title}`,
    `Page ${pageNumber}: ${page.title}`,
    `Age range: ${book.ageRange}`,
    `Spiritual focus: ${book.spiritualFocus}`,
    `Emotional emphasis: ${page.scriptureThread}`,
    `Palette guidance: ${paletteGuidance[page.palette]}`,
    "",
    "SCENE",
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
    "LAYER 4 — SCENE TO ILLUSTRATE (cover only)",
    "Describe only the cover moment. Keep studio style and character bible fixed.",
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
    "SCENE",
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
    "LAYER 4 — SCENE TO ILLUSTRATE (closing only)",
    "Describe only the ending moment. Keep studio style and character bible fixed.",
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
    "SCENE",
    localizeScenePrompt(book, book.closingIllustrationPrompt),
    "",
    "NEGATIVE PROMPT",
    STORYBOOK_ILLUSTRATION_NEGATIVE_PROMPT,
    "text, title lettering, author name, publisher logo.",
  ].join("\n");
}
