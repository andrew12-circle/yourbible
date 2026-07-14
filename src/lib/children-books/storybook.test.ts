import { describe, expect, it } from "vitest";
import {
  buildPageIllustrationPrompt,
  sceneTextFor,
  STORYBOOK_ILLUSTRATION_NEGATIVE_PROMPT,
  STORYBOOK_ILLUSTRATION_SYSTEM_PROMPT,
} from "@/lib/children-books/illustrationPrompt";
import {
  CHILDREN_BOOKS,
  DEFAULT_CHILDREN_BOOK_SLUG,
  buildChildrenBookGenerationPrompt,
  findChildrenBook,
  resolvePageLayout,
} from "@/lib/children-books/storybook";

describe("children book storybook data", () => {
  it("keeps every story page illustrated", () => {
    expect(CHILDREN_BOOKS.length).toBeGreaterThan(0);

    for (const book of CHILDREN_BOOKS) {
      expect(book.pages.length).toBeGreaterThan(0);
      expect(book.closingPrayer.trim()).not.toHaveLength(0);
      expect(book.closingIllustrationPrompt.trim()).not.toHaveLength(0);
      for (const page of book.pages) {
        expect(page.picturePrompt.trim()).not.toHaveLength(0);
        expect(page.scriptureThread.trim()).not.toHaveLength(0);
      }
    }
  });

  it("cycles picture-book layouts when a page has no explicit layout", () => {
    const book = findChildrenBook(DEFAULT_CHILDREN_BOOK_SLUG)!;
    const layouts = book.pages.slice(0, 8).map((page, index) => resolvePageLayout(page, index));

    expect(layouts).toEqual([
      "picture-book",
      "picture-book",
      "picture-book",
      "picture-book",
      "full-spread",
      "picture-book",
      "picture-book",
      "text-pocket",
    ]);
  });

  it("respects an explicit layout override on a page", () => {
    const page = { ...findChildrenBook(DEFAULT_CHILDREN_BOOK_SLUG)!.pages[0]!, layout: "text-only" as const };
    expect(resolvePageLayout(page, 0)).toBe("text-only");
  });

  it("builds an AI generation prompt from the selected book", () => {
    const book = findChildrenBook(DEFAULT_CHILDREN_BOOK_SLUG);

    expect(book).toBeDefined();
    expect(buildChildrenBookGenerationPrompt(book!)).toContain(book!.spiritualFocus);
    expect(buildChildrenBookGenerationPrompt(book!)).toContain("avoid copying protected modern adaptations");
    expect(buildChildrenBookGenerationPrompt(book!)).toContain("studio style");
    expect(buildChildrenBookGenerationPrompt(book!)).toContain("character bible");
  });

  it("includes Aurora as a built-in illustrated book", () => {
    const book = findChildrenBook("aurora-perfect-protection");

    expect(book).toBeDefined();
    expect(book!.title).toBe("Aurora: God's Perfect Protection");
    expect(book!.useDefaultCoverPath).toBe(true);
    expect(book!.useDefaultImagePaths).toBe(true);
    expect(book!.pages).toHaveLength(26);
    expect(book!.pages.at(-1)?.scriptureThread).toContain("Psalm 121:8");
  });

  it("includes Lilly and Ariel treasure adventure as a built-in book", () => {
    const book = findChildrenBook("lilly-and-ariel-treasure");

    expect(book).toBeDefined();
    expect(book!.title).toBe("Lilly and Ariel");
    expect(book!.subtitle).toBe("The Treasure Worth Waiting For");
    expect(book!.series).toBe("Lilly's Adventures");
    expect(book!.characterId).toBe("lilly");
    expect(book!.worldId).toBe("kitchen-coral-reef");
    expect(book!.pages).toHaveLength(35);
    expect(book!.pages[0]?.body).toContain("Sunshine spilled across Lilly's kitchen table");
    expect(book!.pages[28]?.body).toContain("Listen first. Speak gently. Choose wisely.");
    expect(book!.pages.at(-1)?.title).toBe("Talk About the Adventure");
    expect(book!.closingPrayer).toContain("Holy Spirit");
    expect(book!.supportingCastPrompt).toContain("Ariel");
  });
});

describe("page illustration prompts", () => {
  it("wraps each page scene with the full illustration system prompt", () => {
    const book = findChildrenBook(DEFAULT_CHILDREN_BOOK_SLUG)!;
    const page = book.pages[0]!;

    const prompt = buildPageIllustrationPrompt({ book, page, pageNumber: 1 });

    expect(prompt).toContain(STORYBOOK_ILLUSTRATION_SYSTEM_PROMPT.slice(0, 40));
    expect(prompt).toContain(STORYBOOK_ILLUSTRATION_NEGATIVE_PROMPT);
    expect(prompt).toContain("LAYER 1 — LILLY STORYBOOKS STUDIO STYLE");
    expect(prompt).toContain("LAYER 3 — CHARACTER BIBLE: LILLY");
    expect(prompt).toContain("LAYER 4 — SCENE TO ILLUSTRATE");
    expect(prompt).toContain(page.picturePrompt.replace("Cinderella", "Lilly").slice(0, 20));
    expect(prompt).toContain(page.scriptureThread);
    expect(prompt).toContain("Page 1:");
    expect(prompt).toContain("controlled linework");
    expect(prompt).toContain("Avoid photorealism");
  });

  it("builds a complete prompt for every page in every book", () => {
    for (const book of CHILDREN_BOOKS) {
      book.pages.forEach((page, index) => {
        const prompt = buildPageIllustrationPrompt({ book, page, pageNumber: index + 1 });
        expect(prompt.length).toBeGreaterThan(500);
        // Prompt embeds the sanitized scene text (forbidden terms scrubbed).
        expect(prompt).toContain(sceneTextFor(book, page.picturePrompt));
      });
    }
  });
});
