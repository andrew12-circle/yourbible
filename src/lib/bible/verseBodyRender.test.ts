import { describe, expect, it } from "vitest";
import type { PassageVerse } from "@/lib/bible/api";
import { buildVersePartsInnerHtml, buildVerseXrefsInnerHtml } from "@/lib/bible/verseBodyRender";

describe("buildVerseXrefsInnerHtml", () => {
  const verse: PassageVerse = {
    number: 1,
    text: "He looked up",
    parts: [
      { kind: "text", text: "He" },
      { kind: "crossref", label: "Mk 12:41-44", book: "Mk", chapter: 12, verse: 41 },
      { kind: "text", text: " looked up" },
    ],
  };

  it("renders cross-refs below the verse body in inline layout", () => {
    const body = buildVersePartsInnerHtml(verse, new Map(), (s) => s, "inline");
    const xrefs = buildVerseXrefsInnerHtml(verse, (s) => s, "inline");
    expect(body).toBe("He looked up");
    expect(xrefs).toContain('class="scripture-xref"');
    expect(xrefs).toContain("Mk 12:41-44");
    expect(body).not.toContain("Mk 12:41-44");
  });

  it("omits cross-refs for holman layout", () => {
    expect(buildVerseXrefsInnerHtml(verse, (s) => s, "holman")).toBe("");
  });
});
