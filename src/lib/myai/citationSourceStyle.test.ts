import { describe, expect, it } from "vitest";
import { isYouTubeUrl, resolveCitationSourceKind } from "@/lib/myai/citationSourceStyle";
import type { ChatCitation } from "@/lib/myai/parseChatCitations";

describe("citationSourceStyle", () => {
  it("detects YouTube artifact citations", () => {
    const citation: ChatCitation = {
      source_type: "artifact",
      id: "abcabcab-1234-5678-9abc-abcabcabcabc",
      label: "Tim Alberino on ancient empires",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    };
    expect(resolveCitationSourceKind(citation)).toBe("youtube");
  });

  it("detects claim research journal citations", () => {
    const citation: ChatCitation = {
      source_type: "journal",
      id: "abcabcab-1234-5678-9abc-abcabcabcabc",
      label: "Claim research: Genesis 1, describing In the beginning",
    };
    expect(resolveCitationSourceKind(citation)).toBe("claim_research");
  });

  it("uses artifact tone for non-YouTube saved sources", () => {
    const citation: ChatCitation = {
      source_type: "artifact",
      id: "abcabcab-1234-5678-9abc-abcabcabcabc",
      label: "Saved PDF notes",
    };
    expect(resolveCitationSourceKind(citation)).toBe("artifact");
  });

  it("isYouTubeUrl matches common hosts", () => {
    expect(isYouTubeUrl("https://youtu.be/abc123")).toBe(true);
    expect(isYouTubeUrl("https://example.com/video")).toBe(false);
  });
});
