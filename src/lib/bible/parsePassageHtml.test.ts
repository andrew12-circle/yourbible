import { describe, expect, it } from "vitest";
import {
  groupVersesIntoParagraphs,
  parseChapterText,
  parsePassageHtml,
  sanitizePubVerseText,
} from "./parsePassageHtml";

const JOHN1_HTML = `
<p class="p"><span data-number="1" data-sid="JHN 1:1" class="v">1</span>In the beginning was the Word, and the Word was with God, and the Word was God. <span data-number="2" data-sid="JHN 1:2" class="v">2</span>He was with God in the beginning. </p>
<p class="p"><span data-number="3" data-sid="JHN 1:3" class="v">3</span>Through him all things were made; without him nothing was made that has been made. <span data-number="4" data-sid="JHN 1:4" class="v">4</span>In him was life, and that life was the light of all mankind. <span data-number="5" data-sid="JHN 1:5" class="v">5</span>The light shines in the darkness, and the darkness has not overcome it.</p>
<p class="p"><span data-number="6" data-sid="JHN 1:6" class="v">6</span>There was a man sent from God whose name was John. </p>
<p class="s">The Word Became Flesh</p>
<p class="p"><span data-number="14" data-sid="JHN 1:14" class="v">14</span>The Word became flesh and made his dwelling among us.</p>
`;

describe("parsePassageHtml", () => {
  it("extracts verses and paragraph starts from API.Bible HTML", () => {
    const parsed = parsePassageHtml(JOHN1_HTML, "John 1");
    expect(parsed.verses.map((v) => v.number)).toEqual([1, 2, 3, 4, 5, 6, 14]);
    expect(parsed.paragraphStarts).toEqual([1, 3, 6, 14]);
    expect(parsed.headings).toEqual([
      { beforeVerse: 14, text: "The Word Became Flesh" },
    ]);
    expect(parsed.poetryBlocks).toEqual([]);
  });

  it("strips API.Bible footnote hash markers and restores em dashes", () => {
    const html = `
<p class="p"><span class="v">23</span>The Egyptians set out in pursuit<span class="xo">#</span><span class="xt">—</span><span class="xo">#</span>all Pharaoh's horses, his chariots, and his horsemen<span class="xo">#</span><span class="xt">—</span><span class="xo">#</span>and went into the sea after them.</p>`;
    const parsed = parsePassageHtml(html, "Exodus 14");
    expect(parsed.verses[0]?.text).toBe(
      "The Egyptians set out in pursuit\u2014all Pharaoh's horses, his chariots, and his horsemen\u2014and went into the sea after them.",
    );
  });

  it("sanitizes already-parsed #-# debris from cached passages", () => {
    expect(
      sanitizePubVerseText(
        "The Egyptians set out in pursuit#-#all Pharaoh's horses#-#and went into the sea.",
      ),
    ).toBe(
      "The Egyptians set out in pursuit\u2014all Pharaoh's horses\u2014and went into the sea.",
    );
  });

  it("repairs cached small-cap split debris from older parsers", () => {
    expect(
      sanitizePubVerseText(
        "An inscription was above him: T his I s the K ing of the J ews .",
      ),
    ).toBe("An inscription was above him: THIS IS the KING of the JEWS.");
  });

  it("joins small-cap span splits without inserting spaces (CSB inscription text)", () => {
    const html = `
<p class="p"><span data-number="38" data-sid="LUK 23:38" class="v">38</span>An inscription was above him: <span class="sc">T</span>his <span class="sc">I</span>s the <span class="sc">K</span>ing of the <span class="sc">J</span>ews . </p>`;
    const parsed = parsePassageHtml(html, "Luke 23");
    expect(parsed.verses[0]?.text).toBe(
      "An inscription was above him: THIS IS the KING of the JEWS.",
    );
  });

  it("keeps pronoun I separate from following words (CSB John 1:31)", () => {
    const html = `
<p class="p"><span data-number="31" data-sid="JHN 1:31" class="v">31</span><span class="sc">I</span>didn't know him, but <span class="sc">I</span>came baptizing with water so that he might be revealed to Israel.</p>`;
    const parsed = parsePassageHtml(html, "John 1");
    expect(parsed.verses[0]?.text).toBe(
      "I didn't know him, but I came baptizing with water so that he might be revealed to Israel.",
    );
  });

  it("repairs glued pronoun I from older cached parsers", () => {
    expect(
      sanitizePubVerseText(
        "IDIDN't know him, but ICAME baptizing with water so that he might be revealed to Israel.",
      ),
    ).toBe(
      "I didn't know him, but I came baptizing with water so that he might be revealed to Israel.",
    );
  });

  it("strips stray carets and doubled commas from cross-ref debris", () => {
    expect(sanitizePubVerseText("born again, , he cannot")).toBe("born again, he cannot");
    expect(sanitizePubVerseText("Truly I tell you,^unless someone")).toBe(
      "Truly I tell you, unless someone",
    );
    expect(sanitizePubVerseText("the Son of Man. ,")).toBe("the Son of Man.");
  });

  it("preserves divine-name nd spans as styled text parts", () => {
    const html = `<p class="p"><span class="v">1</span>In the <span class="nd">Lord</span> we trust.</p>`;
    const parsed = parsePassageHtml(html);
    const parts = parsed.verses[0]?.parts ?? [];
    expect(parts.some((p) => p.kind === "text" && p.style === "divine" && p.text === "Lord")).toBe(
      true,
    );
    expect(parsed.verses[0]?.text).toBe("In the Lord we trust.");
  });

  it("preserves inline cross-refs and footnotes in verse parts", () => {
    const html = `
<p class="p"><span class="v">16</span>For God loved the world<span class="xo">#</span><span class="xt">John 3:17</span><note><span class="ft">Study note text.</span></note></p>`;
    const parsed = parsePassageHtml(html, "John 3");
    const v = parsed.verses[0];
    expect(v?.crossRefs?.[0]?.label).toBe("John 3:17");
    expect(v?.footnotes?.[0]?.text).toContain("Study note");
    expect(v?.parts?.some((p) => p.kind === "crossref")).toBe(true);
    expect(v?.parts?.some((p) => p.kind === "footnote")).toBe(true);
  });

  it("preserves publisher xo letter markers on cross-refs", () => {
    const html = `
<p class="p"><span class="v">1</span>Text<span class="xo">a</span><span class="xt">Ps 37:37</span><span class="xo">b</span><span class="xt">Job 1:8</span></p>`;
    const parsed = parsePassageHtml(html, "Job 1");
    const xrefs = parsed.verses[0]?.parts?.filter((p) => p.kind === "crossref") ?? [];
    expect(xrefs[0]).toMatchObject({ letter: "a", label: "Ps 37:37" });
    expect(xrefs[1]).toMatchObject({ letter: "b", label: "Job 1:8" });
  });

  it("records poetry block levels from USFM q classes", () => {
    const html = `
<p class="q1"><span class="v">1</span>The Lord is my shepherd;</p>
<p class="q2"><span class="v">2</span>he lets me lie down.</p>`;
    const parsed = parsePassageHtml(html, "Psalm 23");
    expect(parsed.poetryBlocks).toEqual([
      { beforeVerse: 1, level: 1 },
      { beforeVerse: 2, level: 2 },
    ]);
  });

  it("merges verse annotations when the same verse spans blocks", () => {
    const html = `
<p class="p"><span class="v">1</span>First half </p>
<p class="p"><span class="v">1</span>second half.</p>`;
    const parsed = parsePassageHtml(html);
    expect(parsed.verses).toHaveLength(1);
    expect(parsed.verses[0]?.text).toContain("First half");
    expect(parsed.verses[0]?.text).toContain("second half");
  });

  it("preserves spaces between words when inline tags sit on word boundaries", () => {
    const html = `<p class="p"><span class="v">1</span>In the <span class="nd">Lord</span> we trust.</p>`;
    const parsed = parsePassageHtml(html);
    expect(parsed.verses[0]?.text).toBe("In the Lord we trust.");
  });

  it("groups a page slice into continuation vs new paragraphs", () => {
    const parsed = parsePassageHtml(JOHN1_HTML);
    const starts = new Set(parsed.paragraphStarts);
    const slice = parsed.verses.filter((v) => v.number >= 4 && v.number <= 6);
    const groups = groupVersesIntoParagraphs(slice, starts);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.verses.map((v) => v.number)).toEqual([4, 5]);
    expect(groups[0]?.isContinuation).toBe(true);
    expect(groups[1]?.verses.map((v) => v.number)).toEqual([6]);
    expect(groups[1]?.isContinuation).toBe(false);
  });
});

describe("parseChapterText", () => {
  it("parses plain [N] verse markers", () => {
    const verses = parseChapterText("[1] In the beginning. [2] He was with God.");
    expect(verses).toEqual([
      { number: 1, text: "In the beginning.", parts: [{ kind: "text", text: "In the beginning." }] },
      { number: 2, text: "He was with God.", parts: [{ kind: "text", text: "He was with God." }] },
    ]);
  });
});
