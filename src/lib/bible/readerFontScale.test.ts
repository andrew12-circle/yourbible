import { describe, expect, it } from "vitest";
import {
  READER_DESKTOP_FONT_BASE,
  READER_FONT_SCALE_DEFAULT,
  READER_MOBILE_FONT_BASE,
  clampReaderFontScale,
  effectiveReaderFontScaleEm,
} from "@/lib/bible/readerFontScale";

describe("readerFontScale", () => {
  it("clamps display scale into the reader range", () => {
    expect(clampReaderFontScale(0.5)).toBe(0.85);
    expect(clampReaderFontScale(2)).toBe(1.5);
    expect(clampReaderFontScale(1.111)).toBe(1.11);
  });

  it("applies desktop baseline so 100% matches old 85% on spread", () => {
    expect(effectiveReaderFontScaleEm(READER_FONT_SCALE_DEFAULT, { desktopSpread: true })).toBe(
      READER_DESKTOP_FONT_BASE,
    );
    expect(effectiveReaderFontScaleEm(READER_FONT_SCALE_DEFAULT, { compactChrome: true })).toBe(
      READER_MOBILE_FONT_BASE,
    );
    expect(effectiveReaderFontScaleEm(READER_FONT_SCALE_DEFAULT, {})).toBe(1);
  });
});
