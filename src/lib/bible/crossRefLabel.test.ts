import { describe, expect, it } from "vitest";
import { enrichCrossRefLabel, looksLikeFullCrossRefLabel } from "./crossRefLabel";

describe("crossRefLabel", () => {
  it("detects full publisher labels", () => {
    expect(looksLikeFullCrossRefLabel("Mt 12:41")).toBe(true);
    expect(looksLikeFullCrossRefLabel("Neh 3:1")).toBe(true);
  });

  it("enriches verse-only continuation refs", () => {
    expect(enrichCrossRefLabel("32", "Neh", 3, 32)).toBe("Neh 3:32");
    expect(enrichCrossRefLabel("12:39", "Neh", 12, 39)).toBe("Neh 12:39");
    expect(enrichCrossRefLabel("6:6", "Jhn", 6, 6)).toBe("Jn 6:6");
  });

  it("preserves full labels", () => {
    expect(enrichCrossRefLabel("Neh 3:1", "Neh", 3, 1)).toBe("Neh 3:1");
  });
});
