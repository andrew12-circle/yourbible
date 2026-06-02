import { describe, expect, it } from "vitest";
import { entryBodyHasSketchTranscription } from "./sketchTranscription";

describe("entryBodyHasSketchTranscription", () => {
  it("detects sketch transcription markers", () => {
    expect(entryBodyHasSketchTranscription("")).toBe(false);
    expect(entryBodyHasSketchTranscription("plain text")).toBe(false);
    expect(
      entryBodyHasSketchTranscription("<!-- sketch-tx:abc -->\n**From your sketch**"),
    ).toBe(true);
    expect(entryBodyHasSketchTranscription("**From your sketch** (AI transcription)")).toBe(true);
  });
});
