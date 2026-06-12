import { describe, expect, it } from "vitest";
import { BOOKS } from "@/data/books";
import { ETHIOPIAN_BOOKS } from "@/data/ethiopianBooks";
import { EOTC_BIBLE_ID, getBooks } from "@/lib/bible/canon";

describe("canon", () => {
  it("returns 66 Protestant books by default", () => {
    expect(getBooks("protestant")).toHaveLength(66);
    expect(getBooks("protestant")[0]?.abbr).toBe("Gen");
  });

  it("returns 81 Ethiopian Orthodox books", () => {
    expect(getBooks("ethiopian")).toHaveLength(81);
    expect(ETHIOPIAN_BOOKS.some((b) => b.abbr === "Eno")).toBe(true);
    expect(ETHIOPIAN_BOOKS.some((b) => b.abbr === "Jub")).toBe(true);
    expect(ETHIOPIAN_BOOKS.some((b) => b.abbr === "1Mq")).toBe(true);
  });

  it("keeps Protestant-only books out of Ethiopian canon", () => {
    const ethAbbrs = new Set(ETHIOPIAN_BOOKS.map((b) => b.abbr));
    expect(ethAbbrs.has("Eno")).toBe(true);
    expect(BOOKS.length).toBeLessThan(ETHIOPIAN_BOOKS.length);
  });

  it("defines a stable EOTC bible id", () => {
    expect(EOTC_BIBLE_ID).toBe("eotc-am-81");
  });
});
