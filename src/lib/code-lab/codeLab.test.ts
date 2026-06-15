import { describe, expect, it } from "vitest";
import { TEXT_PROFILES } from "@/lib/code-lab/textProfiles";
import { buildTextStream } from "@/lib/code-lab/textStream";
import { searchEls, searchElsAtSkip } from "@/lib/code-lab/elsSearch";
import { buildMatrixView } from "@/lib/code-lab/matrix";
import { shuffleLetters } from "@/lib/code-lab/statistics";
import { parseWlcXml } from "@/lib/code-lab/wlcLoader";

describe("wlcLoader", () => {
  it("parses verse elements from OSIS XML", () => {
    const xml = `
      <verse osisID="Gen.30.20"><w>foo</w>בְּרֵאשִׁית</verse>
      <verse osisID="Gen.30.21"><w>bar</w>אָמַר</verse>
    `;
    const book = parseWlcXml(xml, "Gen");
    expect(book.chapters.length).toBe(1);
    expect(book.chapters[0]?.chapter).toBe(30);
    expect(book.chapters[0]?.verses.length).toBe(2);
  });
});

describe("textProfiles", () => {
  it("strips Latin to A-Z", () => {
    const p = TEXT_PROFILES["latin-letters"];
    expect(p.normalizeRaw("Hello, World! 123")).toBe("HELLOWORLD");
  });

  it("strips Hebrew marks", () => {
    const p = TEXT_PROFILES["hebrew-consonants"];
    expect(p.normalizeRaw("בְּרֵאשִׁית")).toBe("בראשית");
  });
});

describe("elsSearch", () => {
  const profile = TEXT_PROFILES["latin-letters"];
  const stream = buildTextStream("test", profile, [
    { book: "Gen", bookName: "Genesis", chapter: 1, verse: 1, raw: "AXCXE" },
  ]);

  it("finds forward ELS at skip 2", () => {
    const hits = searchElsAtSkip(stream, profile, "ACE", 2, "forward");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.skip).toBe(2);
    expect(hits[0]?.term).toBe("ACE");
  });

  it("finds hits in skip range", () => {
    const hits = searchEls(stream, profile, "ACE", {
      minSkip: 1,
      maxSkip: 3,
      direction: "forward",
    });
    expect(hits.some((h) => h.skip === 2)).toBe(true);
  });
});

describe("matrix", () => {
  it("wraps at skip columns", () => {
    const profile = TEXT_PROFILES["latin-letters"];
    const stream = buildTextStream("test", profile, [
      { book: "Gen", bookName: "Genesis", chapter: 1, verse: 1, raw: "AXCXEFGHIJKLMNOP" },
    ]);
    const hits = searchElsAtSkip(stream, profile, "ACE", 2, "forward");
    expect(hits[0]).toBeDefined();
    const matrix = buildMatrixView(stream, hits[0]!);
    expect(matrix.columns).toBe(2);
    expect(matrix.cells.some((c) => c.isSeed)).toBe(true);
  });
});

describe("shuffleLetters", () => {
  it("preserves length and charset multiset", () => {
    const src = "AABBC";
    const out = shuffleLetters(src, 42);
    expect(out.length).toBe(src.length);
    expect([...out].sort().join("")).toBe([...src].sort().join(""));
  });
});
