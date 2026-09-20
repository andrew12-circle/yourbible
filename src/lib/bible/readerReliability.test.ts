import { describe, expect, it } from "vitest";
import { identifyReaderPassage } from "@/lib/bible/readerPassageIdentity";
import { sanitizePubVerseText } from "@/lib/bible/parsePassageHtml";
import { isPassageCacheFresh, PASSAGE_CACHE_MAX_AGE_MS, passageCacheKey } from "@/lib/bible/passageCache";
import { quantizePageBox } from "@/hooks/useReaderPageMeasurement";
import { readerPageForUnit } from "@/hooks/useReaderPosition";
const sample = { reference: "John 3", verses: [{ number: 1, text: "Synthetic test text." }], paragraphStarts: [1], headings: [] };
describe("reader integrity boundaries", () => {
  it("preserves legitimate uppercase words", () => { expect(sanitizePubVerseText("ISRAEL ISAIAH IMAGE IMMANUEL" )).toBe("ISRAEL ISAIAH IMAGE IMMANUEL"); });
  it("rejects a different chapter", () => { expect(() => identifyReaderPassage(sample, "fixture", "Jhn", 4)).toThrow(/reference/); });
  it("rejects an edition mismatch", () => { const bound = identifyReaderPassage(sample, "first", "Jhn", 3); expect(() => identifyReaderPassage(bound, "second", "Jhn", 3)).toThrow(/edition/); });
  it("rejects duplicate or reversed verses", () => { expect(() => identifyReaderPassage({ ...sample, verses: [sample.verses[0], sample.verses[0]] }, "fixture", "Jhn", 3)).toThrow(/verse data/); });
  it("accepts verified content without rewriting it", () => { const bound = identifyReaderPassage(sample, "fixture", "Jhn", 3); expect(bound.verses).toBe(sample.verses); expect(bound.readerIdentity).toEqual({ bibleId: "fixture", bookAbbr: "Jhn", chapter: 3 }); });
  it("does not round the measurement above the real page", () => { expect(quantizePageBox(371.8, 609.4)).toEqual({ w: 371, h: 609 }); });
  it("expires cached text at the refresh boundary and rejects future timestamps", () => { const now = 2 * PASSAGE_CACHE_MAX_AGE_MS; expect(isPassageCacheFresh(now - 100, now)).toBe(true); expect(isPassageCacheFresh(now - PASSAGE_CACHE_MAX_AGE_MS, now)).toBe(false); expect(isPassageCacheFresh(now + 1, now)).toBe(false); });
  it("isolates repaired cache records from legacy cache keys", () => { expect(passageCacheKey("fixture", "Jhn", 3)).toContain("reader-integrity-v1"); });
  it("locates a verse's page using indexes, not its verse number", () => { expect(readerPageForUnit([0, 3, 8, 12], 7, false)).toBe(1); expect(readerPageForUnit([0, 3, 8, 12], 9, true)).toBe(2); });
});
