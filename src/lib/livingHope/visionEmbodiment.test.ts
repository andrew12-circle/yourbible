import { describe, expect, it } from "vitest";
import {
  composeVisionEmbodiment,
  emptyVisionEmbodimentResponses,
  parseVisionEmbodiment,
} from "@/lib/livingHope/visionEmbodiment";
import { emptyWorkbook } from "@/lib/livingHope/workbookTypes";

describe("visionEmbodiment", () => {
  it("composes multisensory sections from responses", () => {
    const wb = emptyWorkbook();
    wb.vision_headline = "Seven figures, clean structure.";
    const text = composeVisionEmbodiment(wb, {
      ...emptyVisionEmbodimentResponses(),
      where: "Home office at dawn.",
      smell: "Coffee and clean air.",
      declaration: "I am already here.",
    });
    expect(text).toContain("Seven figures");
    expect(text).toContain("Home office");
    expect(text).toContain("Coffee");
    expect(text).toContain("I am already here");
  });

  it("round-trips parse and compose", () => {
    const responses = {
      ...emptyVisionEmbodimentResponses(),
      light: "Soft morning sun.",
      body: "Shoulders down, breath easy.",
    };
    const composed = composeVisionEmbodiment(null, responses);
    const parsed = parseVisionEmbodiment(composed);
    expect(parsed.light).toBe("Soft morning sun.");
    expect(parsed.body).toBe("Shoulders down, breath easy.");
  });
});
