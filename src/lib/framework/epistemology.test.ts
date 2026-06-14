import { describe, expect, it } from "vitest";
import {
  formatEpistemologyMarkdownSections,
  hasEpistemologyContent,
  parseClaimEpistemology,
} from "./epistemology";

describe("parseClaimEpistemology v2", () => {
  it("parses belief-mapping layers", () => {
    const ep = parseClaimEpistemology({
      claim_breakdown: {
        core: "Humans inherited civilization",
        supporting: ["Civilization existed before Adam"],
        implied: ["Non-human intelligent beings existed"],
      },
      evidence: {
        items: [
          { label: "Genesis 1", kind: "scripture", strength: "indirect", note: "Creation order" },
          { label: "ANE cosmology", kind: "scholarship", strength: "inferential" },
        ],
      },
      alternative_views: [
        {
          name: "Traditional Christian view",
          summary: "Adam as first human",
          stance: "opposes",
        },
      ],
      framework_impact: {
        if_accepted: ["Genesis read differently"],
        if_rejected: ["Traditional anthropology remains intact"],
      },
      confidence_axes: {
        scriptural: "weak",
        historical: "moderate",
        scholarly_consensus: "minority",
        speculation: "high",
      },
      questions_raised: ["Who built pre-Adamic civilization?"],
      relationship_links: [{ label: "Human Origins", kind: "doctrine" }],
      confidence_level: "weakly_supported",
      claim_types: ["interpretation"],
    });

    expect(ep).not.toBeNull();
    expect(ep?.claim_breakdown?.core).toBe("Humans inherited civilization");
    expect(ep?.evidence?.items).toHaveLength(2);
    expect(ep?.alternative_views?.[0]?.stance).toBe("opposes");
    expect(ep?.framework_impact?.if_accepted).toHaveLength(1);
    expect(ep?.confidence_axes?.speculation).toBe("high");
    expect(ep?.questions_raised?.[0]).toContain("pre-Adamic");
    expect(hasEpistemologyContent(ep)).toBe(true);
  });

  it("rejects invalid evidence rows", () => {
    const ep = parseClaimEpistemology({
      evidence: {
        items: [{ label: "Genesis 1", kind: "invalid", strength: "direct" }],
      },
    });
    expect(ep).toBeNull();
  });
});

describe("formatEpistemologyMarkdownSections", () => {
  it("includes v2 headings for research handoff", () => {
    const ep = parseClaimEpistemology({
      claim_breakdown: { core: "Core thesis" },
      questions_raised: ["Open question?"],
    });
    expect(ep).not.toBeNull();
    const md = formatEpistemologyMarkdownSections(ep!);
    expect(md.some((l) => l.includes("Claim breakdown"))).toBe(true);
    expect(md.some((l) => l.includes("Questions this raises"))).toBe(true);
  });
});
