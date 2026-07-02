/**
 * Gospel-narrative anchors for James Tissot, Brooklyn Museum accession 00.159.N
 * (Life of Our Lord Jesus Christ series, chronological).
 * Plates between anchors receive interpolated beforeVerse within the segment.
 */
export const BROOKLYN_SKIP = new Set([
  6, 7, 8, 9, 10, // architectural reconstructions (shown via study maps)
  29, 21, 53, 60, 70, 77, 83, 86, 92, 114, 133, 151, 152, 207, 226, 229, 235, 237,
  257, 272, 284, 310, 314, 316, 342, 350, 358, 359, 365, 366, 368, 377, 378, 380, 381,
  383, 385, 387, 388, 390, 393, 396, 398, 399, 404, 407, 412, 413, 414, 415, 418, 419,
  433, 438, 446, 448, 450,
]);

/** @type {{ n: number; bookAbbr: string; chapter: number; beforeVerse: number }[]} */
export const BROOKLYN_ANCHORS = [
  { n: 11, bookAbbr: "Luk", chapter: 2, beforeVerse: 19 },
  { n: 13, bookAbbr: "Luk", chapter: 1, beforeVerse: 13 },
  { n: 15, bookAbbr: "Mat", chapter: 1, beforeVerse: 18 },
  { n: 16, bookAbbr: "Luk", chapter: 1, beforeVerse: 26 },
  { n: 18, bookAbbr: "Luk", chapter: 1, beforeVerse: 39 },
  { n: 19, bookAbbr: "Luk", chapter: 1, beforeVerse: 46 },
  { n: 20, bookAbbr: "Mat", chapter: 1, beforeVerse: 19 },
  { n: 22, bookAbbr: "Mat", chapter: 1, beforeVerse: 20 },
  { n: 23, bookAbbr: "Luk", chapter: 2, beforeVerse: 7 },
  { n: 24, bookAbbr: "Mat", chapter: 2, beforeVerse: 1 },
  { n: 25, bookAbbr: "Luk", chapter: 2, beforeVerse: 8 },
  { n: 26, bookAbbr: "Luk", chapter: 2, beforeVerse: 16 },
  { n: 27, bookAbbr: "Luk", chapter: 2, beforeVerse: 22 },
  { n: 28, bookAbbr: "Luk", chapter: 2, beforeVerse: 25 },
  { n: 30, bookAbbr: "Mat", chapter: 2, beforeVerse: 1 },
  { n: 31, bookAbbr: "Mat", chapter: 2, beforeVerse: 3 },
  { n: 32, bookAbbr: "Mat", chapter: 2, beforeVerse: 11 },
  { n: 33, bookAbbr: "Mat", chapter: 2, beforeVerse: 16 },
  { n: 34, bookAbbr: "Luk", chapter: 1, beforeVerse: 57 },
  { n: 35, bookAbbr: "Mat", chapter: 2, beforeVerse: 13 },
  { n: 36, bookAbbr: "Mat", chapter: 2, beforeVerse: 15 },
  { n: 37, bookAbbr: "Mat", chapter: 2, beforeVerse: 19 },
  { n: 39, bookAbbr: "Luk", chapter: 2, beforeVerse: 43 },
  { n: 40, bookAbbr: "Luk", chapter: 2, beforeVerse: 46 },
  { n: 41, bookAbbr: "Luk", chapter: 2, beforeVerse: 46 },
  { n: 42, bookAbbr: "Luk", chapter: 2, beforeVerse: 52 },
  { n: 44, bookAbbr: "Mat", chapter: 3, beforeVerse: 1 },
  { n: 49, bookAbbr: "Mat", chapter: 3, beforeVerse: 16 },
  { n: 51, bookAbbr: "Mat", chapter: 4, beforeVerse: 1 },
  { n: 54, bookAbbr: "Mat", chapter: 4, beforeVerse: 11 },
  { n: 55, bookAbbr: "Mat", chapter: 4, beforeVerse: 18 },
  { n: 59, bookAbbr: "Jhn", chapter: 1, beforeVerse: 48 },
  { n: 62, bookAbbr: "Jhn", chapter: 2, beforeVerse: 1 },
  { n: 64, bookAbbr: "Jhn", chapter: 3, beforeVerse: 1 },
  { n: 67, bookAbbr: "Jhn", chapter: 5, beforeVerse: 2 },
  { n: 69, bookAbbr: "Jhn", chapter: 4, beforeVerse: 7 },
  { n: 71, bookAbbr: "Luk", chapter: 4, beforeVerse: 16 },
  { n: 75, bookAbbr: "Mrk", chapter: 1, beforeVerse: 23 },
  { n: 76, bookAbbr: "Mat", chapter: 8, beforeVerse: 14 },
  { n: 78, bookAbbr: "Mat", chapter: 8, beforeVerse: 16 },
  { n: 81, bookAbbr: "Luk", chapter: 4, beforeVerse: 15 },
  { n: 84, bookAbbr: "Jhn", chapter: 4, beforeVerse: 46 },
  { n: 85, bookAbbr: "Luk", chapter: 5, beforeVerse: 3 },
  { n: 87, bookAbbr: "Luk", chapter: 5, beforeVerse: 4 },
  { n: 88, bookAbbr: "Mat", chapter: 15, beforeVerse: 30 },
  { n: 89, bookAbbr: "Mat", chapter: 8, beforeVerse: 1 },
  { n: 91, bookAbbr: "Mat", chapter: 9, beforeVerse: 9 },
  { n: 94, bookAbbr: "Mat", chapter: 9, beforeVerse: 10 },
  { n: 95, bookAbbr: "Mrk", chapter: 3, beforeVerse: 1 },
  { n: 98, bookAbbr: "Mat", chapter: 10, beforeVerse: 1 },
  { n: 101, bookAbbr: "Mat", chapter: 8, beforeVerse: 24 },
  { n: 102, bookAbbr: "Mat", chapter: 8, beforeVerse: 26 },
  { n: 104, bookAbbr: "Mrk", chapter: 5, beforeVerse: 9 },
  { n: 106, bookAbbr: "Jhn", chapter: 10, beforeVerse: 11 },
  { n: 108, bookAbbr: "Mat", chapter: 9, beforeVerse: 18 },
  { n: 109, bookAbbr: "Mat", chapter: 13, beforeVerse: 1 },
  { n: 111, bookAbbr: "Mat", chapter: 9, beforeVerse: 20 },
  { n: 115, bookAbbr: "Luk", chapter: 7, beforeVerse: 12 },
  { n: 119, bookAbbr: "Mat", chapter: 13, beforeVerse: 3 },
  { n: 123, bookAbbr: "Mrk", chapter: 2, beforeVerse: 3 },
  { n: 124, bookAbbr: "Mat", chapter: 5, beforeVerse: 1 },
  { n: 127, bookAbbr: "Luk", chapter: 16, beforeVerse: 20 },
  { n: 128, bookAbbr: "Mat", chapter: 9, beforeVerse: 32 },
  { n: 130, bookAbbr: "Mat", chapter: 14, beforeVerse: 1 },
  { n: 131, bookAbbr: "Mat", chapter: 14, beforeVerse: 6 },
  { n: 132, bookAbbr: "Mat", chapter: 14, beforeVerse: 8 },
  { n: 134, bookAbbr: "Mat", chapter: 14, beforeVerse: 19 },
  { n: 138, bookAbbr: "Mat", chapter: 14, beforeVerse: 25 },
  { n: 140, bookAbbr: "Mat", chapter: 14, beforeVerse: 29 },
  { n: 142, bookAbbr: "Mat", chapter: 23, beforeVerse: 13 },
  { n: 145, bookAbbr: "Mat", chapter: 17, beforeVerse: 1 },
  { n: 148, bookAbbr: "Mat", chapter: 16, beforeVerse: 18 },
  { n: 150, bookAbbr: "Mat", chapter: 18, beforeVerse: 2 },
  { n: 155, bookAbbr: "Luk", chapter: 7, beforeVerse: 37 },
  { n: 159, bookAbbr: "Mat", chapter: 19, beforeVerse: 22 },
  { n: 161, bookAbbr: "Luk", chapter: 17, beforeVerse: 12 },
  { n: 162, bookAbbr: "Jhn", chapter: 11, beforeVerse: 1 },
  { n: 167, bookAbbr: "Mat", chapter: 6, beforeVerse: 9 },
  { n: 169, bookAbbr: "Jhn", chapter: 8, beforeVerse: 3 },
  { n: 175, bookAbbr: "Luk", chapter: 10, beforeVerse: 33 },
  { n: 179, bookAbbr: "Mat", chapter: 25, beforeVerse: 1 },
  { n: 181, bookAbbr: "Jhn", chapter: 11, beforeVerse: 43 },
  { n: 182, bookAbbr: "Jhn", chapter: 11, beforeVerse: 35 },
  { n: 185, bookAbbr: "Luk", chapter: 15, beforeVerse: 20 },
  { n: 188, bookAbbr: "Mat", chapter: 19, beforeVerse: 14 },
  { n: 189, bookAbbr: "Luk", chapter: 19, beforeVerse: 2 },
  { n: 190, bookAbbr: "Mat", chapter: 20, beforeVerse: 30 },
  { n: 192, bookAbbr: "Mat", chapter: 21, beforeVerse: 8 },
  { n: 193, bookAbbr: "Luk", chapter: 19, beforeVerse: 41 },
  { n: 196, bookAbbr: "Mat", chapter: 26, beforeVerse: 3 },
  { n: 197, bookAbbr: "Mat", chapter: 21, beforeVerse: 19 },
  { n: 198, bookAbbr: "Mat", chapter: 21, beforeVerse: 12 },
  { n: 211, bookAbbr: "Luk", chapter: 21, beforeVerse: 2 },
  { n: 213, bookAbbr: "Mat", chapter: 24, beforeVerse: 2 },
  { n: 214, bookAbbr: "Mat", chapter: 26, beforeVerse: 6 },
  { n: 215, bookAbbr: "Mat", chapter: 26, beforeVerse: 4 },
  { n: 216, bookAbbr: "Mat", chapter: 26, beforeVerse: 14 },
  { n: 219, bookAbbr: "Luk", chapter: 22, beforeVerse: 10 },
  { n: 220, bookAbbr: "Mat", chapter: 26, beforeVerse: 26 },
  { n: 221, bookAbbr: "Mat", chapter: 26, beforeVerse: 23 },
  { n: 222, bookAbbr: "Jhn", chapter: 13, beforeVerse: 5 },
  { n: 224, bookAbbr: "Mat", chapter: 26, beforeVerse: 25 },
  { n: 228, bookAbbr: "Mat", chapter: 26, beforeVerse: 33 },
  { n: 231, bookAbbr: "Mat", chapter: 26, beforeVerse: 36 },
  { n: 232, bookAbbr: "Mat", chapter: 26, beforeVerse: 40 },
  { n: 234, bookAbbr: "Mat", chapter: 26, beforeVerse: 48 },
  { n: 238, bookAbbr: "Luk", chapter: 22, beforeVerse: 50 },
  { n: 241, bookAbbr: "Mat", chapter: 26, beforeVerse: 56 },
  { n: 243, bookAbbr: "Jhn", chapter: 18, beforeVerse: 13 },
  { n: 245, bookAbbr: "Mat", chapter: 26, beforeVerse: 69 },
  { n: 246, bookAbbr: "Mat", chapter: 26, beforeVerse: 71 },
  { n: 249, bookAbbr: "Mat", chapter: 26, beforeVerse: 75 },
  { n: 250, bookAbbr: "Mat", chapter: 26, beforeVerse: 74 },
  { n: 255, bookAbbr: "Mat", chapter: 27, beforeVerse: 3 },
  { n: 256, bookAbbr: "Mat", chapter: 27, beforeVerse: 5 },
  { n: 258, bookAbbr: "Mat", chapter: 27, beforeVerse: 2 },
  { n: 259, bookAbbr: "Mat", chapter: 27, beforeVerse: 11 },
  { n: 261, bookAbbr: "Luk", chapter: 23, beforeVerse: 7 },
  { n: 262, bookAbbr: "Luk", chapter: 23, beforeVerse: 11 },
  { n: 263, bookAbbr: "Mat", chapter: 27, beforeVerse: 26 },
  { n: 266, bookAbbr: "Mat", chapter: 27, beforeVerse: 29 },
  { n: 267, bookAbbr: "Jhn", chapter: 19, beforeVerse: 5 },
  { n: 269, bookAbbr: "Mat", chapter: 27, beforeVerse: 15 },
  { n: 270, bookAbbr: "Mat", chapter: 27, beforeVerse: 22 },
  { n: 271, bookAbbr: "Mat", chapter: 27, beforeVerse: 24 },
  { n: 273, bookAbbr: "Mat", chapter: 27, beforeVerse: 31 },
  { n: 278, bookAbbr: "Mat", chapter: 27, beforeVerse: 32 },
  { n: 280, bookAbbr: "Luk", chapter: 23, beforeVerse: 27 },
  { n: 281, bookAbbr: "Mat", chapter: 27, beforeVerse: 32 },
  { n: 283, bookAbbr: "Luk", chapter: 23, beforeVerse: 27 },
  { n: 290, bookAbbr: "Mat", chapter: 27, beforeVerse: 28 },
  { n: 292, bookAbbr: "Mat", chapter: 27, beforeVerse: 35 },
  { n: 296, bookAbbr: "Luk", chapter: 23, beforeVerse: 43 },
  { n: 300, bookAbbr: "Jhn", chapter: 19, beforeVerse: 26 },
  { n: 302, bookAbbr: "Mat", chapter: 27, beforeVerse: 46 },
  { n: 303, bookAbbr: "Jhn", chapter: 19, beforeVerse: 28 },
  { n: 304, bookAbbr: "Jhn", chapter: 19, beforeVerse: 30 },
  { n: 305, bookAbbr: "Mat", chapter: 27, beforeVerse: 50 },
  { n: 309, bookAbbr: "Mat", chapter: 27, beforeVerse: 54 },
  { n: 315, bookAbbr: "Jhn", chapter: 19, beforeVerse: 34 },
  { n: 320, bookAbbr: "Mat", chapter: 27, beforeVerse: 57 },
  { n: 325, bookAbbr: "Mat", chapter: 27, beforeVerse: 60 },
  { n: 328, bookAbbr: "Mat", chapter: 28, beforeVerse: 5 },
  { n: 332, bookAbbr: "Jhn", chapter: 20, beforeVerse: 3 },
  { n: 334, bookAbbr: "Jhn", chapter: 20, beforeVerse: 14 },
  { n: 335, bookAbbr: "Jhn", chapter: 20, beforeVerse: 17 },
  { n: 336, bookAbbr: "Luk", chapter: 24, beforeVerse: 34 },
  { n: 338, bookAbbr: "Luk", chapter: 24, beforeVerse: 13 },
  { n: 340, bookAbbr: "Jhn", chapter: 20, beforeVerse: 19 },
  { n: 341, bookAbbr: "Jhn", chapter: 20, beforeVerse: 25 },
  { n: 343, bookAbbr: "Jhn", chapter: 21, beforeVerse: 1 },
  { n: 345, bookAbbr: "Jhn", chapter: 21, beforeVerse: 6 },
  { n: 346, bookAbbr: "Jhn", chapter: 21, beforeVerse: 12 },
  { n: 347, bookAbbr: "Jhn", chapter: 21, beforeVerse: 15 },
  { n: 348, bookAbbr: "Act", chapter: 1, beforeVerse: 9 },
];

export function passageForBrooklynAccession(n) {
  if (BROOKLYN_SKIP.has(n)) return null;
  const anchors = BROOKLYN_ANCHORS;
  if (n < anchors[0].n || n > anchors[anchors.length - 1].n) return null;

  let lo = anchors[0];
  let hi = anchors[anchors.length - 1];
  for (let i = 0; i < anchors.length - 1; i++) {
    if (n >= anchors[i].n && n <= anchors[i + 1].n) {
      lo = anchors[i];
      hi = anchors[i + 1];
      break;
    }
  }

  if (n === lo.n) return { bookAbbr: lo.bookAbbr, chapter: lo.chapter, beforeVerse: lo.beforeVerse };
  if (n === hi.n) return { bookAbbr: hi.bookAbbr, chapter: hi.chapter, beforeVerse: hi.beforeVerse };

  const span = hi.n - lo.n;
  const t = span > 0 ? (n - lo.n) / span : 0;

  if (lo.bookAbbr === hi.bookAbbr && lo.chapter === hi.chapter) {
    const minV = Math.min(lo.beforeVerse, hi.beforeVerse);
    const maxV = Math.max(lo.beforeVerse, hi.beforeVerse);
    const beforeVerse = Math.max(1, Math.round(minV + t * Math.max(1, maxV - minV)));
    return { bookAbbr: lo.bookAbbr, chapter: lo.chapter, beforeVerse };
  }

  return t < 0.5
    ? { bookAbbr: lo.bookAbbr, chapter: lo.chapter, beforeVerse: lo.beforeVerse }
    : { bookAbbr: hi.bookAbbr, chapter: hi.chapter, beforeVerse: hi.beforeVerse };
}

export function extractBrooklynAccession(credit, filename = "") {
  const hay = `${credit ?? ""} ${filename}`;
  const m = hay.match(/00\.159\.(\d+)/);
  return m ? Number(m[1]) : null;
}
