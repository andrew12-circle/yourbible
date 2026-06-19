import { describe, expect, it } from "vitest";
import { journalEntryHeaderPad } from "./hubShellClasses";

describe("journalEntryHeaderPad", () => {
  it("uses minimal padding inside hub shell and mini-phone panes", () => {
    expect(journalEntryHeaderPad(true, false)).toBe("pt-2");
    expect(journalEntryHeaderPad(false, true)).toBe("pt-2");
    expect(journalEntryHeaderPad(true, true)).toBe("pt-2");
  });

  it("applies device safe-area on standalone mobile", () => {
    expect(journalEntryHeaderPad(false, false)).toBe(
      "pt-[calc(var(--safe-area-inset-top)+0.5rem)]",
    );
  });
});
