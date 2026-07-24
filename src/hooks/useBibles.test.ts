import { beforeEach, describe, expect, it } from "vitest";
import { API_BIBLE_CSB_ID } from "@/lib/bible/bibleEditions";
import { EOTC_BIBLE_ID, LS_CANON_KEY } from "@/lib/bible/canon";
import { LS_BIBLE_KEY } from "@/lib/bible/storedBibleId";
import { LOCAL_BIBLE_FALLBACKS, pickDefaultBibleId } from "@/hooks/useBibles";

describe("Bible selection fallbacks", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to bundled CSB when remote translations are unavailable", () => {
    expect(pickDefaultBibleId([], null)).toBe(API_BIBLE_CSB_ID);
  });

  it("ignores a stored Ethiopian edition in the Protestant canon", () => {
    localStorage.setItem(LS_BIBLE_KEY, EOTC_BIBLE_ID);

    expect(pickDefaultBibleId(LOCAL_BIBLE_FALLBACKS, EOTC_BIBLE_ID)).toBe(API_BIBLE_CSB_ID);
  });

  it("uses EOTC for the Ethiopian canon even without remote translations", () => {
    localStorage.setItem(LS_CANON_KEY, "ethiopian");

    expect(pickDefaultBibleId([], null)).toBe(EOTC_BIBLE_ID);
  });
});
