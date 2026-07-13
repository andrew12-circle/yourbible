import { describe, expect, it } from "vitest";
import {
  coverImageStorageKey,
  defaultCoverImagePath,
  defaultPageImagePath,
  pageImageStorageKey,
  resolveCoverImageUrl,
  resolvePageImageUrl,
} from "@/lib/children-books/pageImages";
import { findChildrenBook } from "@/lib/children-books/storybook";

describe("pageImages", () => {
  it("builds default public asset paths", () => {
    expect(defaultPageImagePath("kingdom-invitation", 1)).toBe("/children-books/kingdom-invitation/01.png");
    expect(defaultPageImagePath("kingdom-invitation", 12)).toBe("/children-books/kingdom-invitation/12.png");
    expect(defaultCoverImagePath("kingdom-invitation")).toBe("/children-books/kingdom-invitation/cover.png");
  });

  it("prefers imageUrl over stored and default paths", () => {
    const book = findChildrenBook("kingdom-invitation")!;
    const page = {
      ...book.pages[0]!,
      imageUrl: "/custom.webp",
      useDefaultImagePath: true,
    };

    expect(resolvePageImageUrl(book, page, 1)).toBe("/custom.webp");
  });

  it("uses default path when flagged on the page", () => {
    const book = findChildrenBook("kingdom-invitation")!;
    const page = { ...book.pages[0]!, useDefaultImagePath: true };

    expect(resolvePageImageUrl(book, page, 1)).toBe("/children-books/kingdom-invitation/01.png");
  });

  it("uses book-level default image paths", () => {
    const book = { ...findChildrenBook("kingdom-invitation")!, useDefaultImagePaths: true };
    const page = book.pages[0]!;

    expect(resolvePageImageUrl(book, page, 1)).toBe("/children-books/kingdom-invitation/01.png");
  });

  it("uses stable localStorage keys", () => {
    expect(pageImageStorageKey("kingdom-invitation", 3)).toBe("yb_children_book_img:kingdom-invitation:3");
    expect(coverImageStorageKey("kingdom-invitation")).toBe("yb_children_book_cover:kingdom-invitation");
  });

  it("resolves cover image paths from book defaults", () => {
    const book = { ...findChildrenBook("kingdom-invitation")!, useDefaultCoverPath: true };
    expect(resolveCoverImageUrl(book)).toBe("/children-books/kingdom-invitation/cover.png");
  });

  it("prefers explicit coverImageUrl", () => {
    const book = {
      ...findChildrenBook("kingdom-invitation")!,
      coverImageUrl: "/custom-cover.png",
      useDefaultCoverPath: true,
    };
    expect(resolveCoverImageUrl(book)).toBe("/custom-cover.png");
  });
});
