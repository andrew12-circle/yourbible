import { describe, expect, it } from "vitest";
import {
  shouldShowChapterDropCap,
  wrapVerseShellHtml,
} from "./scriptureParagraph";

describe("scripture verse layout", () => {
  it("shows chapter drop cap on verse 1 at paragraph start", () => {
    expect(shouldShowChapterDropCap(1, false)).toBe(true);
    expect(shouldShowChapterDropCap(1, true)).toBe(false);
    expect(shouldShowChapterDropCap(2, false)).toBe(false);
  });

  it("wraps measurement HTML with gutter numbers and drop cap", () => {
    const open = wrapVerseShellHtml(1, 2, "Why do the nations rage", false);
    expect(open).toContain('class="chapter-drop-cap">2');
    expect(open).not.toContain("verse-num-gutter");

    const row = wrapVerseShellHtml(3, 2, "The kings of the earth", false);
    expect(row).toContain('class="verse-num verse-num-gutter">3');
  });
});
