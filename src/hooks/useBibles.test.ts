import { afterEach, describe, expect, it } from "vitest";
import { API_BIBLE_CSB_ID } from "@/lib/bible/bibleEditions";
import { EOTC_BIBLE_ID, LS_CANON_KEY } from "@/lib/bible/canon";
import type { BibleEntry } from "@/lib/bible/api";
import {
  BUNDLED_READER_LANGUAGE,
  LS_BIBLE_LANGUAGE_KEY,
  pickDefaultBibleId,
  readBibleLanguage,
  readerBibleOptions,
} from "./useBibles";

const csb: BibleEntry = {
  id: API_BIBLE_CSB_ID,
  abbreviation: "CSB",
  name: "Christian Standard Bible",
  language: { id: "eng", name: "English" },
};

const eotc: BibleEntry = {
  id: EOTC_BIBLE_ID,
  abbreviation: "EOTC",
  name: "Ethiopian Orthodox Bible",
  language: { id: "amh", name: "Amharic" },
};

const wlc: BibleEntry = {
  id: "wlc-hebrew",
  abbreviation: "WLC",
  name: "Westminster Leningrad Codex",
  language: { id: "heb", name: "Hebrew" },
};

describe("reader translation defaults", () => {
  afterEach(() => localStorage.clear());

  it("uses bundled CSB rather than the first EOTC entry in the Protestant canon", () => {
    localStorage.setItem(LS_CANON_KEY, "protestant");

    expect(readerBibleOptions([eotc, wlc, csb])).toEqual([csb]);
    expect(pickDefaultBibleId([eotc, wlc, csb], null)).toBe(csb.id);
  });

  it("does not retain a cross-canon EOTC selection for Protestant reading", () => {
    localStorage.setItem(LS_CANON_KEY, "protestant");

    expect(pickDefaultBibleId([eotc, csb], eotc.id)).toBe(csb.id);
    expect(pickDefaultBibleId([eotc, wlc, csb], wlc.id)).toBe(csb.id);
    expect(pickDefaultBibleId([eotc], eotc.id)).toBe("");
  });

  it("uses EOTC only while the Ethiopian canon is active", () => {
    localStorage.setItem(LS_CANON_KEY, "ethiopian");

    expect(readerBibleOptions([eotc, csb])).toEqual([eotc]);
    expect(pickDefaultBibleId([eotc, csb], csb.id)).toBe(eotc.id);
  });

  it("normalizes legacy remote-language selections to the bundled reader language", () => {
    localStorage.setItem(LS_BIBLE_LANGUAGE_KEY, "spa");

    expect(readBibleLanguage()).toBe(BUNDLED_READER_LANGUAGE);
    expect(localStorage.getItem(LS_BIBLE_LANGUAGE_KEY)).toBe(BUNDLED_READER_LANGUAGE);
  });
});
