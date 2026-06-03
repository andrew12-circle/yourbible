import { describe, expect, it } from "vitest";
import { isSketchPhotoRow } from "./artifactJournalEntry";

describe("artifactJournalEntry", () => {
  it("recognizes canonical sketch storage paths", () => {
    expect(isSketchPhotoRow("user-1/entry-1/sketch-entry-1.png")).toBe(true);
    expect(isSketchPhotoRow("user-1/entry-1/photo.jpg")).toBe(false);
  });
});
