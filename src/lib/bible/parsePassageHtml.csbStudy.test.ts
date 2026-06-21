import { describe, expect, it } from "vitest";
import { parsePassageHtml, parseVerseHtmlToParts } from "./parsePassageHtml";

const JHN5_30_HTML = `
<p class="m"><span data-number="30" class="v">30</span><span class="wj">I judge only as I hear, and my judgment</span><span class="f"> <span class="fr">5:30 </span><span class="ft"><span class="xt"><span id="MAT.12.41">Mt 12:41</span>; <span id="2TH.1.5">2Th 1:5</span></span></span></span> <span class="wj">is just,</span></p>`;

const JHN5_35_HTML = `
<p class="m"><span data-number="35" class="v">35</span><span class="wj">John</span><span class="f"> <span class="fr">5:35 </span><span class="ft">Lit </span><span class="fqa">That man</span></span><span class="sup">,</span><span class="f"> <span class="fr">5:35 </span><span class="ft"><span class="xt"><span id="MRK.1.4">Mk 1:4</span></span></span></span> <span class="wj">was a burning and shining lamp,</span></p>`;

describe("CSB study span.f apparatus", () => {
  it("parses cross-refs inside span.f/ft/xt without leaking into verse text", () => {
    const parsed = parsePassageHtml(JHN5_30_HTML, "John 5");
    const v = parsed.verses.find((x) => x.number === 30);
    expect(v?.text).not.toMatch(/5:30|Mt 12:41/);
    expect(v?.text).toContain("my judgment");
    expect(v?.text).toContain("is just");
    const xrefs = v?.parts?.filter((p) => p.kind === "crossref") ?? [];
    expect(xrefs.map((x) => x.label)).toEqual(expect.arrayContaining(["Mt 12:41", "2Th 1:5"]));
  });

  it("parses Lit footnotes and cross-refs in span.f blocks", () => {
    const parsed = parsePassageHtml(JHN5_35_HTML, "John 5");
    const v = parsed.verses.find((x) => x.number === 35);
    expect(v?.text).not.toMatch(/5:35|Lit That man|Mk 1:4/);
    expect(v?.parts?.some((p) => p.kind === "footnote" && p.text.includes("Lit"))).toBe(true);
    expect(v?.parts?.some((p) => p.kind === "crossref" && p.label === "Mk 1:4")).toBe(true);
  });

  it("preserves small-cap inscription markup alongside study notes", () => {
    const html = `An inscription was above him: <span class="sc">T</span>his <span class="sc">I</span>s the <span class="sc">K</span>ing of the <span class="sc">J</span>ews .`;
    const { parts } = parseVerseHtmlToParts(html);
    const text = parts.filter((p) => p.kind === "text").map((p) => p.text).join("");
    expect(text).toBe("An inscription was above him: THIS IS the KING of the JEWS.");
  });
});
