import { describe, expect, it } from "vitest";
import { buildBriefSummaryFromPack, buildPackContextForChat } from "./claimResearchRuns";
import { sanitizeResearchSectionBody } from "./claimResearchPack";

describe("sanitizeResearchSectionBody", () => {
  it("strips leading epistemic line", () => {
    expect(sanitizeResearchSectionBody("Epistemic: training_only\n\nHello world.")).toBe("Hello world.");
  });
});

describe("buildBriefSummaryFromPack", () => {
  it("prefers synthesis section", () => {
    const brief = buildBriefSummaryFromPack({
      sections: {
        synthesis: { body: "Epistemic: mixed\n\nShort synthesis.", epistemic: "mixed" },
        bible_alignment: { body: "Longer alignment text.", epistemic: "unknown" },
      },
    });
    expect(brief).toBe("Short synthesis.");
  });
});

describe("buildPackContextForChat", () => {
  it("truncates very long packs", () => {
    const pack = {
      pack_type: "validation" as const,
      sections: {
        bible_alignment: { body: "x".repeat(20000), epistemic: "unknown" },
      },
    };
    const ctx = buildPackContextForChat(pack, 80);
    expect(ctx.length).toBeLessThanOrEqual(140);
    expect(ctx).toContain("truncated");
  });
});
