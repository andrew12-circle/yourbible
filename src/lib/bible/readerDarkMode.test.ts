import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  LS_READER_DARK,
  readReaderDarkPreference,
  resolveReaderDark,
  writeReaderDarkPreference,
} from "@/lib/bible/readerDarkMode";

describe("readerDarkMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("defaults to system when unset", () => {
    expect(readReaderDarkPreference()).toBe("system");
  });

  it("reads explicit light and dark overrides", () => {
    localStorage.setItem(LS_READER_DARK, "1");
    expect(readReaderDarkPreference()).toBe("dark");
    localStorage.setItem(LS_READER_DARK, "0");
    expect(readReaderDarkPreference()).toBe("light");
  });

  it("clears storage when set back to system", () => {
    writeReaderDarkPreference("dark");
    expect(localStorage.getItem(LS_READER_DARK)).toBe("1");
    writeReaderDarkPreference("system");
    expect(localStorage.getItem(LS_READER_DARK)).toBeNull();
  });

  it("resolves system preference from matchMedia", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true }),
    );
    expect(resolveReaderDark("system")).toBe(true);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false }),
    );
    expect(resolveReaderDark("system")).toBe(false);
    expect(resolveReaderDark("dark")).toBe(true);
    expect(resolveReaderDark("light")).toBe(false);
  });
});
