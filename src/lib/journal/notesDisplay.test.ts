import { describe, expect, it } from "vitest";
import {
  noteDateGroup,
  noteDisplayPreview,
  noteDisplayTitle,
} from "@/lib/journal/notesDisplay";

describe("notesDisplay", () => {
  it("uses first body line as title when title is empty", () => {
    expect(noteDisplayTitle(null, "Buy milk\nSecond line")).toBe("Buy milk");
  });

  it("skips title line in preview when title matches first line", () => {
    expect(noteDisplayPreview("Meeting", "Meeting\nDiscuss Q3 goals")).toContain("Discuss Q3");
  });

  it("groups pinned notes separately", () => {
    expect(noteDateGroup(new Date().toISOString(), true)).toBe("pinned");
  });
});
