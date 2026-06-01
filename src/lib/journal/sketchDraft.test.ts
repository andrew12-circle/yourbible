import { afterEach, describe, expect, it } from "vitest";
import {
  clearSketchDraft,
  loadSketchDraft,
  saveSketchDraft,
  sketchDraftStorageKey,
} from "./sketchDraft";

describe("sketchDraft", () => {
  afterEach(() => {
    clearSketchDraft("test-entry");
  });

  it("round-trips stroke drafts in localStorage", () => {
    saveSketchDraft("test-entry", {
      strokes: [
        {
          tool: "pen",
          color: "#111827",
          size: 4,
          points: [{ x: 1, y: 2, p: 0.5 }],
        },
      ],
      paper: "ruled",
      color: "#111827",
      size: 4,
      tool: "pen",
    });

    const loaded = loadSketchDraft("test-entry");
    expect(loaded?.strokes).toHaveLength(1);
    expect(loaded?.strokes[0].points[0]).toEqual({ x: 1, y: 2, p: 0.5 });
    expect(localStorage.getItem(sketchDraftStorageKey("test-entry"))).toContain('"version":1');
  });
});
