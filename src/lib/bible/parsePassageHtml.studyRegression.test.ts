import { describe, expect, it } from "vitest";
import { parsePassageHtml } from "./parsePassageHtml";

/** Fixed CSB-style HTML snippets — guard against parser regressions on publisher cross-refs. */
const FIXTURES = {
  jhn1_1: `<p class="m"><span data-number="1" class="v">1</span>In the beginning<span class="f"> <span class="fr">1:1 </span><span class="ft"><span class="xt"><span id="GEN.1.1">Gn 1:1</span></span></span></span> was the Word.</p>`,
  jhn5_30: `<p class="m"><span data-number="30" class="v">30</span>Text<span class="f"> <span class="fr">5:30 </span><span class="ft"><span class="xt"><span id="MAT.12.41">Mt 12:41</span>; <span id="2TH.1.5">2Th 1:5</span></span></span></span> end.</p>`,
  psa23_1: `<p class="q1"><span data-number="1" class="v">1</span>The Lord is my shepherd<span class="f"> <span class="fr">23:1 </span><span class="ft"><span class="xt"><span id="PSA.78.52">Ps 78:52</span></span></span></span>.</p>`,
  rom8_1: `<p class="m"><span data-number="1" class="v">1</span>Therefore<span class="f"> <span class="fr">8:1 </span><span class="ft"><span class="xt"><span id="ROM.5.1">Rm 5:1</span></span></span></span> no condemnation.</p>`,
} as const;

function xrefLabels(html: string, reference: string, verse: number): string[] {
  const parsed = parsePassageHtml(html, reference);
  const v = parsed.verses.find((x) => x.number === verse);
  return (v?.parts?.filter((p) => p.kind === "crossref") ?? []).map((p) => p.label);
}

describe("study cross-ref regression (API.Bible CSB markup)", () => {
  it("John 1:1 — Gn 1:1", () => {
    expect(xrefLabels(FIXTURES.jhn1_1, "John 1", 1)).toEqual(["Gn 1:1"]);
  });

  it("John 5:30 — Mt 12:41 and 2Th 1:5", () => {
    expect(xrefLabels(FIXTURES.jhn5_30, "John 5", 30)).toEqual(
      expect.arrayContaining(["Mt 12:41", "2Th 1:5"]),
    );
  });

  it("Psalm 23:1 — Ps 78:52", () => {
    expect(xrefLabels(FIXTURES.psa23_1, "Psalm 23", 1)).toEqual(["Ps 78:52"]);
  });

  it("Romans 8:1 — Rm 5:1", () => {
    expect(xrefLabels(FIXTURES.rom8_1, "Romans 8", 1)).toEqual(["Rm 5:1"]);
  });

  it("keeps study apparatus out of verse plain text", () => {
    const parsed = parsePassageHtml(FIXTURES.jhn5_30, "John 5");
    const v = parsed.verses.find((x) => x.number === 30);
    expect(v?.text).not.toMatch(/Mt 12:41|5:30/);
    expect(v?.text).toContain("Text");
  });
});
