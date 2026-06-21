import { describe, expect, it } from "vitest";
import { isStudyBibleEdition, resolveStudyLayout } from "@/lib/bible/readerStudyLayout";

describe("readerStudyLayout", () => {
  it("auto-enables Holman layout for CSB and NKJV", () => {
    expect(resolveStudyLayout("auto", "CSB")).toBe("holman");
    expect(resolveStudyLayout("auto", "nkjv")).toBe("holman");
    expect(resolveStudyLayout("auto", "KJV")).toBe("inline");
  });

  it("respects explicit preference", () => {
    expect(resolveStudyLayout("inline", "CSB")).toBe("inline");
    expect(resolveStudyLayout("holman", "KJV")).toBe("holman");
  });

  it("detects study bible editions", () => {
    expect(isStudyBibleEdition("HCSB")).toBe(true);
    expect(isStudyBibleEdition("ESV")).toBe(false);
  });
});
