import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parsePassageHtml } from "@/lib/bible/parsePassageHtml";
import { GOLDEN_CSB_CHAPTERS, goldenFixtureHtmlPath } from "@/lib/bible/goldenChapters";

/**
 * Corpus-wide guard that every parsed golden chapter reads like a printed Bible.
 * These patterns are unambiguous typesetting defects that API.Bible markup can
 * introduce (footnote-caller debris, non-breaking spaces before closing quotes,
 * glued words from concatenated footnote fragments, etc.). Legitimate CSB
 * typography (e.g. a thin space between adjacent opening quotes `“ ‘`) is not
 * flagged here.
 */
const BODY_DEFECTS: { id: string; re: RegExp }[] = [
  { id: "space-before-closing-quote", re: /\s[”’]/ },
  { id: "orphan-comma-after-closing-quote", re: /[.!?][”’]\s*,/ },
  { id: "double-space", re: / {2,}/ },
  { id: "footnote-hash-anchor", re: /#/ },
  { id: "stray-caret", re: /\^/ },
  { id: "double-comma", re: /,\s*,/ },
  { id: "space-before-punctuation", re: /\s[,.;:!?]/ },
  { id: "missing-space-after-punctuation", re: /[,.;:][A-Za-z]/ },
  { id: "glued-words", re: /[a-z][A-Z]/ },
  { id: "leading-punctuation", re: /^[,.;:]/ },
];

const FOOTNOTE_DEFECTS: { id: string; re: RegExp }[] = [
  { id: "space-before-closing-quote", re: /\s[”’]/ },
  { id: "double-space", re: / {2,}/ },
  { id: "footnote-hash-anchor", re: /#/ },
  { id: "stray-caret", re: /\^/ },
  { id: "glued-words", re: /[a-z][A-Z]/ },
  { id: "missing-space-after-punctuation", re: /[,.;:][A-Za-z]/ },
];

describe("scripture formatting across golden CSB chapters", () => {
  for (const spec of GOLDEN_CSB_CHAPTERS) {
    it(`${spec.reference} has no verse/footnote typesetting defects`, () => {
      const fixturePath = path.join(process.cwd(), goldenFixtureHtmlPath(spec.id));
      if (!fs.existsSync(fixturePath)) {
        throw new Error(
          `Missing fixture ${fixturePath}. Run: npm run fetch:golden-fixtures`,
        );
      }
      const parsed = parsePassageHtml(fs.readFileSync(fixturePath, "utf8"), spec.reference);
      const offenders: string[] = [];
      for (const v of parsed.verses) {
        for (const d of BODY_DEFECTS) {
          if (d.re.test(v.text)) offenders.push(`v${v.number} [${d.id}]: ${JSON.stringify(v.text)}`);
        }
        for (const fn of v.footnotes ?? []) {
          for (const d of FOOTNOTE_DEFECTS) {
            if (d.re.test(fn.text)) {
              offenders.push(`v${v.number} fn${fn.marker} [${d.id}]: ${JSON.stringify(fn.text)}`);
            }
          }
        }
      }
      expect(offenders, offenders.join("\n")).toEqual([]);
    });
  }
});
