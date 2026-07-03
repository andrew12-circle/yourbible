import { describe, expect, it } from "vitest";
import { filterProvisionScriptures, PROVISION_SCRIPTURES } from "@/lib/prayer/provisionScriptures";
import { versesForRef } from "@/lib/prayer/verseTextForRef";
import type { Passage } from "@/lib/bible/api";

describe("filterProvisionScriptures", () => {
  it("returns all entries when category is all and query is empty", () => {
    expect(filterProvisionScriptures("all", "")).toHaveLength(PROVISION_SCRIPTURES.length);
  });

  it("filters by category", () => {
    const finances = filterProvisionScriptures("finances", "");
    expect(finances.length).toBeGreaterThan(0);
    expect(finances.every((e) => e.category === "finances")).toBe(true);
  });

  it("filters by query against ref and theme", () => {
    const hits = filterProvisionScriptures("all", "philippians");
    expect(hits.some((h) => h.ref.includes("Philippians"))).toBe(true);
  });
});

describe("versesForRef", () => {
  const passage: Passage = {
    reference: "Php 4",
    verses: [
      { number: 18, text: "A" },
      { number: 19, text: "B" },
      { number: 20, text: "C" },
    ],
    paragraphStarts: [18],
    headings: [],
  };

  it("returns a single verse", () => {
    expect(versesForRef(passage, "Philippians 4:19")).toHaveLength(1);
    expect(versesForRef(passage, "Philippians 4:19")[0]?.text).toBe("B");
  });

  it("returns a verse range", () => {
    expect(versesForRef(passage, "Philippians 4:19-20")).toHaveLength(2);
  });
});
