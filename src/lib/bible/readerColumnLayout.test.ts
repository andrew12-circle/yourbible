import { describe, expect, it } from "vitest";
import {
  effectiveReaderColumnLayout,
  readerColumnClassName,
} from "@/lib/bible/readerColumnLayout";

describe("readerColumnLayout", () => {
  it("honors stored preference in page mode", () => {
    expect(effectiveReaderColumnLayout({ stored: "double" })).toBe("double");
    expect(effectiveReaderColumnLayout({ stored: "single" })).toBe("single");
    expect(effectiveReaderColumnLayout({})).toBe("single");
  });

  it("forces single column in scroll mode regardless of stored preference", () => {
    expect(effectiveReaderColumnLayout({ stored: "double", scrollMode: true })).toBe(
      "single",
    );
  });

  it("maps layout to column CSS class", () => {
    expect(readerColumnClassName("single")).toBe("");
    expect(readerColumnClassName("double")).toBe("scripture-columns-2");
  });
});
