import { describe, expect, it } from "vitest";
import {
  computeReaderLayoutFingerprint,
  readerInkStorageKey,
} from "@/lib/ink/layoutFingerprint";

describe("computeReaderLayoutFingerprint", () => {
  it("is stable for the same layout inputs", () => {
    const input = {
      bibleId: "abc123",
      fontScale: 1.1,
      pageWidth: 320,
      pageHeight: 480,
      singlePage: true,
    };
    expect(computeReaderLayoutFingerprint(input)).toBe(
      computeReaderLayoutFingerprint(input),
    );
  });

  it("does not change when only the bible translation changes", () => {
    const base = computeReaderLayoutFingerprint({
      bibleId: "abc123",
      fontScale: 1,
      pageWidth: 320,
      pageHeight: 480,
      singlePage: false,
    });
    const otherBible = computeReaderLayoutFingerprint({
      bibleId: "xyz789",
      fontScale: 1,
      pageWidth: 320,
      pageHeight: 480,
      singlePage: false,
    });
    expect(otherBible).toBe(base);
  });

  it("changes when font scale or page box changes", () => {
    const base = computeReaderLayoutFingerprint({
      bibleId: "abc123",
      fontScale: 1,
      pageWidth: 320,
      pageHeight: 480,
      singlePage: false,
    });
    const biggerFont = computeReaderLayoutFingerprint({
      bibleId: "abc123",
      fontScale: 1.2,
      pageWidth: 320,
      pageHeight: 480,
      singlePage: false,
    });
    const wider = computeReaderLayoutFingerprint({
      bibleId: "abc123",
      fontScale: 1,
      pageWidth: 400,
      pageHeight: 480,
      singlePage: false,
    });
    expect(biggerFont).not.toBe(base);
    expect(wider).not.toBe(base);
  });
});

describe("readerInkStorageKey", () => {
  it("includes fingerprint and page coordinates", () => {
    const key = readerInkStorageKey("fp1", "Jhn", 3, 2, "left");
    expect(key).toBe("yb.reader.ink.fp1.Jhn.3.2.left");
  });
});
