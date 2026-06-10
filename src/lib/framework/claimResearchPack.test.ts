import { describe, expect, it } from "vitest";
import {
  classifyDiscoveredSource,
  formatPassageFetchError,
  formatResearchPackMarkdown,
  groupDiscoveredSources,
  partitionScriptureEntries,
  sanitizeResearchSectionBody,
} from "./claimResearchPack";

describe("formatPassageFetchError", () => {
  it("extracts nested API message instead of raw JSON", () => {
    const raw =
      'bible-passage 404: {"error":"API.Bible: 404","details":"{\\"statusCode\\":404,\\"message\\":\\"Could not find that passage\\"}"}';
    expect(formatPassageFetchError(raw)).toBe("Not available in your selected Bible translation.");
  });

  it("maps 404 bible-passage to a friendly line", () => {
    expect(formatPassageFetchError("bible-passage 404: something")).toBe(
      "Not available in your selected Bible translation.",
    );
  });
});

describe("partitionScriptureEntries", () => {
  it("splits loaded text from failed refs", () => {
    const { loaded, failed } = partitionScriptureEntries([
      { ref: "Romans 12:2", text: "And be not conformed…" },
      {
        ref: "2 Corinthians 12:9",
        error: 'bible-passage 404: {"message":"Could not find that passage"}',
      },
    ]);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].ref).toBe("Romans 12:2");
    expect(failed).toHaveLength(1);
    expect(failed[0].message).toBe("Not available in your selected Bible translation.");
  });
});

describe("sanitizeResearchSectionBody", () => {
  it("removes epistemic prefix from model body", () => {
    expect(sanitizeResearchSectionBody("Epistemic: scripture_text\n\nBody here.")).toBe("Body here.");
  });
});

describe("classifyDiscoveredSource", () => {
  it("detects YouTube URLs", () => {
    expect(classifyDiscoveredSource("https://www.youtube.com/watch?v=abc", "Talk title")).toBe("youtube");
  });

  it("detects book retailers", () => {
    expect(classifyDiscoveredSource("https://www.amazon.com/dp/123", "Some Book")).toBe("book");
  });

  it("detects scholarly hosts", () => {
    expect(classifyDiscoveredSource("https://www.jstor.org/stable/123", "Paper")).toBe("study");
  });
});

describe("groupDiscoveredSources", () => {
  it("groups by kind", () => {
    const grouped = groupDiscoveredSources([
      { kind: "youtube", title: "Video", url: "https://youtube.com/x" },
      { kind: "book", title: "Book", url: "https://amazon.com/x" },
    ]);
    expect(grouped.youtube).toHaveLength(1);
    expect(grouped.book).toHaveLength(1);
  });
});

describe("formatResearchPackMarkdown", () => {
  it("includes conclusion and discovered sources", () => {
    const md = formatResearchPackMarkdown({
      pack_type: "standard",
      research_conclusion: "Honest summary here.",
      discovered_sources: [
        { kind: "youtube", title: "A sermon", url: "https://youtube.com/watch?v=1", snippet: "Snippet" },
      ],
      sections: {
        synthesis: { body: "Body", epistemic: "mixed" },
      },
      meta: { used_web: true, discovery_count: 1, web_provider: "brave" },
    });
    expect(md).toContain("## Research conclusion");
    expect(md).toContain("Honest summary here.");
    expect(md).toContain("## Sources gathered");
    expect(md).toContain("A sermon");
  });

  it("does not duplicate passage errors under reference notes", () => {
    const md = formatResearchPackMarkdown({
      pack_type: "validation",
      sections: {
        bible_alignment: { body: "Summary here.", epistemic: "unknown" },
      },
      scripture: [
        {
          ref: "2 Corinthians 12:9",
          error: 'bible-passage 404: {"message":"Could not find that passage"}',
        },
      ],
      meta: {
        ref_parse_errors: [
          {
            ref: "2 Corinthians 12:9",
            error: 'bible-passage 404: {"message":"Could not find that passage"}',
          },
        ],
      },
    });
    expect(md).toContain("## Passages we could not load");
    expect(md).toContain("Not available in your selected Bible translation");
    expect(md).not.toContain("## Reference notes");
    expect(md).not.toContain('{"error"');
  });
});
