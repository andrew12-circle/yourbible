import { describe, expect, it } from "vitest";
import { myAiBodyForResearchScope } from "@/lib/myai/researchScope";

describe("myAiBodyForResearchScope", () => {
  const defaults = { includeGeneral: false, responseDepth: "reflect" as const };

  it("passes defaults when no scope", () => {
    expect(myAiBodyForResearchScope(undefined, defaults)).toEqual({
      include_general_knowledge: false,
      response_depth: "reflect",
    });
  });

  it("library mode deepens inward search only", () => {
    expect(myAiBodyForResearchScope("library", { includeGeneral: true, responseDepth: "auto" })).toEqual({
      research_scope: "library",
      include_general_knowledge: false,
      response_depth: "deep",
    });
  });

  it("web mode enables outward research", () => {
    expect(myAiBodyForResearchScope("web", defaults)).toEqual({
      research_scope: "web",
      include_general_knowledge: true,
      response_depth: "deep",
    });
  });
});
