import { parseBibleReference } from "@/lib/bible/parseBibleReference";

/** CSB/NKJV-style print abbreviations for enriched cross-ref labels. */
const PRINT_ABBR: Record<string, string> = {
  Gen: "Gn",
  Exo: "Ex",
  Lev: "Lv",
  Num: "Nm",
  Deu: "Dt",
  Jos: "Jos",
  Jdg: "Jdg",
  Rut: "Ru",
  "1Sa": "1Sm",
  "2Sa": "2Sm",
  "1Ki": "1Kg",
  "2Ki": "2Kg",
  "1Ch": "1Ch",
  "2Ch": "2Ch",
  Ezr: "Ezr",
  Neh: "Neh",
  Est: "Est",
  Job: "Jb",
  Psa: "Ps",
  Pro: "Pr",
  Ecc: "Ec",
  Sng: "Sg",
  Isa: "Is",
  Jer: "Jr",
  Lam: "Lm",
  Ezk: "Ezk",
  Dan: "Dn",
  Hos: "Hs",
  Jol: "Jl",
  Amo: "Am",
  Oba: "Ob",
  Jon: "Jnh",
  Mic: "Mc",
  Nam: "Na",
  Hab: "Hb",
  Zep: "Zp",
  Hag: "Hg",
  Zec: "Zch",
  Mal: "Ml",
  Mat: "Mt",
  Mrk: "Mk",
  Luk: "Lk",
  Jhn: "Jn",
  Act: "Ac",
  Rom: "Rm",
  "1Co": "1Co",
  "2Co": "2Co",
  Gal: "Gl",
  Eph: "Eph",
  Php: "Php",
  Col: "Col",
  "1Th": "1Th",
  "2Th": "2Th",
  "1Ti": "1Tm",
  "2Ti": "2Tm",
  Tit: "Ti",
  Phm: "Phm",
  Heb: "Heb",
  Jas: "Jms",
  "1Pe": "1Pt",
  "2Pe": "2Pt",
  "1Jn": "1Jn",
  "2Jn": "2Jn",
  "3Jn": "3Jn",
  Jud: "Jd",
  Rev: "Rv",
};

export function printAbbrevForBook(bookAbbr: string): string {
  return PRINT_ABBR[bookAbbr] ?? bookAbbr;
}

/** True when the label already includes a book name or abbreviation. */
export function looksLikeFullCrossRefLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  return parseBibleReference(trimmed) != null;
}

/**
 * Publisher xt spans often omit the book on continuation refs (`32`, `12:39`, `6:6`).
 * Rebuild a display label from the USFM span id when needed.
 */
export function enrichCrossRefLabel(
  labelRaw: string,
  bookAbbr: string,
  chapter: number,
  verse: number,
): string {
  const label = labelRaw.trim();
  if (!label) return label;
  if (looksLikeFullCrossRefLabel(label)) return label;

  const printAbbr = printAbbrevForBook(bookAbbr);

  if (/^\d+$/.test(label)) {
    return `${printAbbr} ${chapter}:${label}`;
  }

  if (/^\d+:\d+(?:\s*[–—-]\s*\d+)?$/.test(label)) {
    return `${printAbbr} ${label}`;
  }

  if (/^\d+:\d+(?:\s*[–—-]\s*\d+:\d+)?$/.test(label)) {
    return `${printAbbr} ${label}`;
  }

  return `${printAbbr} ${chapter}:${verse}`;
}
