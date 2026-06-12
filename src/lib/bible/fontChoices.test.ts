import { describe, expect, it } from "vitest";
import {
  normalizeFontChoice,
  pageTypoClass,
  readerScriptureTypographyStyle,
  scriptureFontFamily,
} from "@/lib/bible/fontChoices";

describe("fontChoices", () => {
  it("normalizes unknown values to serif", () => {
    expect(normalizeFontChoice(undefined)).toBe("serif");
    expect(normalizeFontChoice("")).toBe("serif");
    expect(normalizeFontChoice("Cormorant")).toBe("serif");
  });

  it("maps each choice to a distinct font stack", () => {
    const serif = scriptureFontFamily("serif");
    const sans = scriptureFontFamily("sans");
    const sf = scriptureFontFamily("sf");
    expect(serif).toContain("Cormorant");
    expect(sans).toContain("Inter");
    expect(sf).toContain("-apple-system");
    expect(new Set([serif, sans, sf]).size).toBe(3);
  });

  it("pageTypoClass switches tailwind font utilities", () => {
    expect(pageTypoClass("serif")).toContain("font-scripture");
    expect(pageTypoClass("sans")).toContain("font-sans");
    expect(pageTypoClass("sf")).toContain("font-system");
    expect(pageTypoClass("sf")).toContain("reader-sf-body");
    expect(pageTypoClass("sf")).not.toContain("ink-text");
    expect(pageTypoClass("sans")).not.toContain("font-scripture");
  });

  it("readerScriptureTypographyStyle applies scale and family", () => {
    expect(readerScriptureTypographyStyle("sans", 1.1)).toEqual({
      fontSize: "1.1em",
      fontFamily: scriptureFontFamily("sans"),
    });
    expect(readerScriptureTypographyStyle("sans", 1, { desktopSpread: true })).toEqual({
      fontSize: "0.85em",
      fontFamily: scriptureFontFamily("sans"),
    });
  });
});
