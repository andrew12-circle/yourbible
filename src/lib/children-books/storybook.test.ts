import { describe, expect, it } from "vitest";
import {
  CHILDREN_BOOKS,
  DEFAULT_CHILDREN_BOOK_SLUG,
  buildChildrenBookGenerationPrompt,
  findChildrenBook,
} from "@/lib/children-books/storybook";

describe("children book storybook data", () => {
  it("keeps every story page illustrated", () => {
    expect(CHILDREN_BOOKS.length).toBeGreaterThan(0);

    for (const book of CHILDREN_BOOKS) {
      expect(book.pages.length).toBeGreaterThan(0);
      for (const page of book.pages) {
        expect(page.picturePrompt.trim()).not.toHaveLength(0);
        expect(page.scriptureThread.trim()).not.toHaveLength(0);
      }
    }
  });

  it("builds an AI generation prompt from the selected book", () => {
    const book = findChildrenBook(DEFAULT_CHILDREN_BOOK_SLUG);

    expect(book).toBeDefined();
    expect(buildChildrenBookGenerationPrompt(book!)).toContain(book!.spiritualFocus);
    expect(buildChildrenBookGenerationPrompt(book!)).toContain("avoid copying protected modern adaptations");
  });
});
