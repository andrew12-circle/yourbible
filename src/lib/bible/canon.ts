import { BOOKS, findBookByAbbr as findProtestantBook, type BibleBook } from "@/data/books";
import { ETHIOPIAN_BOOKS } from "@/data/ethiopianBooks";

export type CanonId = "protestant" | "ethiopian";

export const LS_CANON_KEY = "yb.bibleCanon";
/** Virtual bible id for EOTC Amharic 81-book text (proxied via bible-passage edge). */
export const EOTC_BIBLE_ID = "eotc-am-81";
/** Westminster Leningrad Codex — Open Scriptures morphhb (Tanakh, 39 OT books). */
export const WLC_BIBLE_ID = "wlc-hebrew";

export const EOTC_BIBLE_ENTRY = {
  id: EOTC_BIBLE_ID,
  abbreviation: "EOTC",
  name: "Ethiopian Orthodox Bible (Amharic, 81 books)",
  language: { id: "amh", name: "Amharic" },
  description: "EOTCOpenSource / 80-weahadu",
} as const;

export const WLC_BIBLE_ENTRY = {
  id: WLC_BIBLE_ID,
  abbreviation: "WLC",
  name: "Westminster Leningrad Codex (Hebrew Tanakh)",
  language: { id: "heb", name: "Hebrew" },
  description: "Open Scriptures morphhb — documentary Leningrad source",
} as const;

export function readCanon(): CanonId {
  try {
    const v = localStorage.getItem(LS_CANON_KEY);
    return v === "ethiopian" ? "ethiopian" : "protestant";
  } catch {
    return "protestant";
  }
}

export function writeCanon(canon: CanonId): void {
  localStorage.setItem(LS_CANON_KEY, canon);
}

export function isEotcBibleId(bibleId: string): boolean {
  return bibleId === EOTC_BIBLE_ID;
}

export function isWlcBibleId(bibleId: string): boolean {
  return bibleId === WLC_BIBLE_ID;
}

export function getBooks(canon: CanonId = readCanon()): BibleBook[] {
  return canon === "ethiopian" ? ETHIOPIAN_BOOKS : BOOKS;
}

export function findBookByAbbr(abbr: string, canon: CanonId = readCanon()): BibleBook | undefined {
  const list = getBooks(canon);
  return list.find((b) => b.abbr.toLowerCase() === abbr.toLowerCase());
}

export function findBookByAbbrAny(abbr: string): BibleBook | undefined {
  return findBookByAbbr(abbr, "ethiopian") ?? findProtestantBook(abbr);
}

export function eotcFileForAbbr(abbr: string): string | undefined {
  return ETHIOPIAN_BOOKS.find((b) => b.abbr.toLowerCase() === abbr.toLowerCase())?.eotcFile;
}
