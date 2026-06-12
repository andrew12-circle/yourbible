import { describe, expect, it } from "vitest";
import { parseChatCitations, resolveSourceAttributionDisplay } from "./parseChatCitations";

describe("parseChatCitations", () => {
  it("reads provenance marker and splits internal vs outside sources", () => {
    const parsed = parseChatCitations([
      { source_type: "journal", id: "798b717b-63c9-4070-b929-bb50144021ab", label: "Journal entry" },
      { source_type: "attribution", label: "framework_only" },
    ]);
    expect(parsed.provenance).toBe("framework_only");
    expect(parsed.internalSources).toHaveLength(1);
    expect(parsed.outsideSources).toHaveLength(0);
  });

  it("infers web OpenAI from general citation label", () => {
    const parsed = parseChatCitations([
      { source_type: "general", label: "Web search (OpenAI)" },
      { source_type: "belief", id: "abcabcab-1234-5678-9abc-abcabcabcabc", label: "Belief on prayer" },
    ]);
    expect(parsed.provenance).toBe("web_openai");
    expect(resolveSourceAttributionDisplay(parsed)?.kind).toBe("web_openai");
  });
});
