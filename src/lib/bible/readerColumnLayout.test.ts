import { describe, expect, it } from "vitest";
import {
  effectiveReaderColumnLayout,
  readerColumnClassName,
} from "@/lib/bible/readerColumnLayout";

describe("readerColumnLayout", () => {
  it("uses two columns only on open-book spread", () => {
    expect(effectiveReaderColumnLayout({ spread: true })).toBe("double");
    expect(effectiveReaderColumnLayout({ spread: true, stored: "single" })).toBe(
      "double",
    );
  });

  it("forces single column on phones and single-page layouts", () => {
    expect(effectiveReaderColumnLayout({ spread: false })).toBe("single");
    expect(effectiveReaderColumnLayout({ spread: false, stored: "double" })).toBe(
      "single",
    );
  });

  it("maps layout to column CSS class", () => {
    expect(readerColumnClassName("single")).toBe("");
    expect(readerColumnClassName("double")).toBe("scripture-columns-2");
  });
});
