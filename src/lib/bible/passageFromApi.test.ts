import { describe, expect, it } from "vitest";
import { resolvePassageFromApi } from "@/lib/bible/api";

const JHN5_30_HTML = `
<p class="m"><span data-number="30" class="v">30</span><span class="wj">I judge only as I hear, and my judgment</span><span class="f"> <span class="fr">5:30 </span><span class="ft"><span class="xt"><span id="MAT.12.41">Mt 12:41</span>; <span id="2TH.1.5">2Th 1:5</span></span></span></span> <span class="wj">is just,</span></p>`;

describe("resolvePassageFromApi", () => {
  it("re-parses rawContent on the client instead of trusting server verses", () => {
    const passage = resolvePassageFromApi({
      reference: "John 5",
      rawContent: JHN5_30_HTML,
      verses: [
        {
          number: 30,
          text: "I judge only as I hear, and my judgment 5:30 Mt 12:41; 2Th 1:5 is just,",
        },
      ],
      paragraphStarts: [30],
      headings: [],
      poetryBlocks: [],
      textRevision: "api-bible-csb-2024",
    });

    const v = passage.verses.find((x) => x.number === 30);
    expect(v?.text).not.toMatch(/5:30|Mt 12:41/);
    expect(v?.parts?.some((p) => p.kind === "crossref" && p.label === "Mt 12:41")).toBe(true);
  });
});
