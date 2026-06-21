import { describe, expect, it } from "vitest";
import { buildVersePartsInnerHtml } from "@/lib/bible/verseBodyRender";
import { splitJesusSpeechForChapter } from "@/lib/bible/redLetter";

describe("red-letter Holman parity", () => {
  it("marks only quoted Jesus speech, not narration (CSB Mat 13:11)", () => {
    const verses = [
      {
        number: 11,
        text: 'He answered them, "Because the secrets of the kingdom of heaven have been given for you to know, but not for them."',
        parts: [
          { kind: "text" as const, text: 'He answered them, "' },
          {
            kind: "text" as const,
            text: "Because the secrets of the kingdom of heaven have been given for you to know, but not for them.",
          },
          { kind: "text" as const, text: '"' },
        ],
      },
    ];
    const segs = splitJesusSpeechForChapter("Mat", 13, verses);
    const html = buildVersePartsInnerHtml(
      verses[0]!,
      segs,
      (s) => s.replace(/&/g, "&amp;"),
    );
    expect(html).toContain('class="red-letter"');
    expect(html).toContain("Because the secrets");
    expect(html).not.toMatch(/red-letter">He answered/);
  });

  it("does not apply bold weight in red-letter HTML (color-only emphasis)", () => {
    const verses = [
      {
        number: 3,
        text: '"Blessed are the poor in spirit."',
        parts: [{ kind: "text" as const, text: '"Blessed are the poor in spirit."' }],
      },
    ];
    const segs = splitJesusSpeechForChapter("Mat", 5, verses);
    const html = buildVersePartsInnerHtml(verses[0]!, segs, (s) => s);
    expect(html).toContain('class="red-letter"');
    expect(html).not.toContain("font-weight");
  });
});
