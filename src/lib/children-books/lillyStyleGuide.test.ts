import { describe, expect, it } from "vitest";
import {
  buildLillySystemPrompt,
  LILLY_CHARACTER_MODEL_SHEET,
  LILLY_MASTER_PROMPT,
  LILLY_STORYBOOK_ART_BIBLE,
} from "@/lib/children-books/lillyStyleGuide";
import { buildPageIllustrationPrompt } from "@/lib/children-books/illustrationPrompt";
import { findChildrenBook } from "@/lib/children-books/storybook";

describe("Lilly Storybook Art Bible", () => {
  it("includes master prompt and full art bible", () => {
    const system = buildLillySystemPrompt("Lilly");
    expect(system).toContain(LILLY_MASTER_PROMPT);
    expect(system).toContain(LILLY_STORYBOOK_ART_BIBLE);
    expect(system).toContain(LILLY_CHARACTER_MODEL_SHEET);
    expect(system).toContain("clean ink linework");
    expect(system).toContain("Never photorealistic");
  });

  it("localizes Cinderella scenes to Lilly in page prompts", () => {
    const book = findChildrenBook("kingdom-invitation")!;
    const page = book.pages[0]!;
    const prompt = buildPageIllustrationPrompt({ book, page, pageNumber: 1 });

    expect(prompt).toContain("Lilly Storybook Art Bible");
    expect(prompt).toContain("LILLY CHARACTER MODEL SHEET");
    expect(prompt).toContain("Avoid photorealism");
    expect(prompt).not.toContain("Cinderella kneeling");
  });
});
