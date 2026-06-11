import { describe, expect, it } from "vitest";
import { parseBibleReference, looksLikeBibleReference } from "./parseBibleReference";

describe("parseBibleReference", () => {
  it("parses book chapter verse", () => {
    expect(parseBibleReference("John 3:16")).toEqual({
      bookAbbr: "Jhn",
      chapter: 3,
      verse: 16,
    });
  });

  it("parses chapter-only references", () => {
    expect(parseBibleReference("Psalm 23")).toEqual({
      bookAbbr: "Psa",
      chapter: 23,
      verse: undefined,
    });
  });

  it("detects reference-shaped queries", () => {
    expect(looksLikeBibleReference("Jn 3:16")).toBe(true);
    expect(looksLikeBibleReference("grace")).toBe(false);
  });
});
