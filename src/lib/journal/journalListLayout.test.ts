import { describe, expect, it } from "vitest";
import { JOURNAL_SECTION_HEADING_CLASS } from "@/lib/journal/journalListLayout";

describe("journal list section headings", () => {
  it("keeps dividers in flow in portrait and landscape mobile layouts", () => {
    const classes = JOURNAL_SECTION_HEADING_CLASS.split(" ");

    expect(classes).not.toContain("sticky");
    expect(classes.some((className) => className.includes("sticky"))).toBe(false);
    expect(classes).toContain("bg-background");
    expect(classes).not.toContain("bg-background/85");
  });
});
