/**
 * Red-letter Bible support — segment a verse into Jesus/non-Jesus text.
 *
 * Conservative approach: only apply red letters when the verse is in a known
 * range where Jesus is the speaker. Inside those ranges, any text in paired
 * quotation marks ("…", "…", '…') is treated as Jesus' direct speech.
 *
 * Outside those ranges, the verse is returned as a single non-Jesus segment.
 */

export type Segment = { text: string; isJesus: boolean };

/** Inclusive verse range in a single chapter. */
type Range = [chapter: number, fromVerse: number, toVerse: number];

/**
 * Curated red-letter ranges — biased toward classic published red-letter
 * editions. Conservative; better to under-paint than to color the wrong
 * speaker red.
 */
const RED_RANGES: Record<string, Range[]> = {
  // ---- Matthew ----
  Mat: [
    [4, 4, 4], [4, 7, 7], [4, 10, 10], [4, 17, 17], [4, 19, 19],
    [5, 3, 48], [6, 1, 34], [7, 1, 27],          // Sermon on the Mount
    [8, 3, 3], [8, 4, 4], [8, 7, 7], [8, 10, 13], [8, 20, 22], [8, 26, 26], [8, 32, 32],
    [9, 2, 2], [9, 4, 6], [9, 9, 9], [9, 12, 13], [9, 15, 17], [9, 22, 22], [9, 24, 24], [9, 28, 29], [9, 37, 38],
    [10, 5, 42],
    [11, 4, 6], [11, 7, 19], [11, 21, 30],
    [12, 3, 8], [12, 11, 13], [12, 25, 45], [12, 48, 50],
    [13, 3, 9], [13, 11, 23], [13, 24, 30], [13, 31, 33], [13, 37, 52], [13, 57, 57],
    [14, 16, 18], [14, 27, 27], [14, 29, 29], [14, 31, 31],
    [15, 3, 11], [15, 13, 14], [15, 16, 20], [15, 24, 28], [15, 32, 34],
    [16, 2, 4], [16, 6, 12], [16, 15, 19], [16, 23, 28],
    [17, 7, 7], [17, 9, 12], [17, 17, 18], [17, 20, 21], [17, 22, 23], [17, 25, 27],
    [18, 3, 35],
    [19, 4, 6], [19, 8, 12], [19, 14, 14], [19, 17, 21], [19, 23, 30],
    [20, 1, 16], [20, 18, 19], [20, 21, 23], [20, 25, 28], [20, 32, 32],
    [21, 2, 3], [21, 13, 13], [21, 16, 16], [21, 19, 19], [21, 21, 22], [21, 24, 32], [21, 33, 44],
    [22, 1, 14], [22, 18, 21], [22, 29, 32], [22, 37, 40], [22, 42, 45],
    [23, 2, 39],
    [24, 2, 51],
    [25, 1, 46],
    [26, 2, 2], [26, 10, 13], [26, 18, 18], [26, 21, 21], [26, 23, 24], [26, 26, 29], [26, 31, 32], [26, 34, 34], [26, 36, 36], [26, 38, 40], [26, 41, 42], [26, 45, 46], [26, 50, 50], [26, 52, 54], [26, 55, 55], [26, 64, 64],
    [27, 11, 11], [27, 46, 46],
    [28, 9, 10], [28, 18, 20],
  ],
  // ---- Mark ----
  Mar: [
    [1, 15, 15], [1, 17, 17], [1, 25, 25], [1, 38, 38], [1, 41, 41], [1, 44, 44],
    [2, 5, 5], [2, 8, 11], [2, 14, 14], [2, 17, 17], [2, 19, 22], [2, 25, 28],
    [3, 3, 5], [3, 23, 29], [3, 33, 35],
    [4, 3, 32], [4, 35, 40],
    [5, 8, 9], [5, 19, 19], [5, 30, 30], [5, 34, 34], [5, 36, 36], [5, 39, 41],
    [6, 4, 4], [6, 10, 11], [6, 31, 31], [6, 37, 38], [6, 50, 50],
    [7, 6, 23], [7, 27, 29], [7, 34, 34],
    [8, 1, 5], [8, 12, 21], [8, 26, 26], [8, 29, 30], [8, 33, 38],
    [9, 1, 1], [9, 12, 13], [9, 16, 19], [9, 21, 29], [9, 31, 31], [9, 33, 50],
    [10, 3, 3], [10, 5, 9], [10, 11, 12], [10, 14, 15], [10, 18, 21], [10, 23, 31], [10, 33, 34], [10, 36, 45], [10, 49, 49], [10, 51, 52],
    [11, 2, 3], [11, 14, 14], [11, 17, 17], [11, 22, 26], [11, 29, 33],
    [12, 1, 11], [12, 15, 17], [12, 24, 27], [12, 29, 31], [12, 34, 34], [12, 35, 40], [12, 43, 44],
    [13, 2, 37],
    [14, 6, 9], [14, 13, 15], [14, 18, 18], [14, 20, 21], [14, 22, 25], [14, 27, 30], [14, 32, 32], [14, 34, 38], [14, 41, 42], [14, 48, 49], [14, 62, 62],
    [15, 2, 2],
    [16, 15, 18],
  ],
  // ---- Luke ----
  Luk: [
    [2, 49, 49],
    [4, 4, 4], [4, 8, 8], [4, 12, 12], [4, 18, 21], [4, 23, 27], [4, 35, 35], [4, 43, 43],
    [5, 4, 4], [5, 10, 10], [5, 13, 14], [5, 20, 20], [5, 22, 24], [5, 27, 27], [5, 31, 32], [5, 34, 39],
    [6, 3, 5], [6, 8, 10], [6, 20, 49],
    [7, 9, 9], [7, 13, 14], [7, 22, 28], [7, 31, 35], [7, 40, 47], [7, 48, 50],
    [8, 10, 18], [8, 21, 22], [8, 25, 25], [8, 30, 30], [8, 39, 39], [8, 46, 46], [8, 48, 48], [8, 50, 50], [8, 52, 54],
    [9, 3, 5], [9, 13, 14], [9, 20, 27], [9, 41, 44], [9, 48, 50], [9, 55, 62],
    [10, 2, 16], [10, 18, 24], [10, 26, 28], [10, 30, 37], [10, 41, 42],
    [11, 2, 13], [11, 17, 36], [11, 39, 52],
    [12, 1, 53], [12, 56, 59],
    [13, 2, 9], [13, 12, 12], [13, 15, 16], [13, 18, 21], [13, 24, 30], [13, 32, 35],
    [14, 3, 5], [14, 8, 24], [14, 26, 35],
    [15, 3, 32],                                  // Lost sheep / coin / prodigal
    [16, 1, 31],
    [17, 1, 10], [17, 14, 14], [17, 17, 19], [17, 20, 37],
    [18, 1, 8], [18, 9, 14], [18, 16, 17], [18, 19, 22], [18, 24, 30], [18, 31, 33], [18, 41, 42],
    [19, 5, 5], [19, 9, 10], [19, 12, 27], [19, 30, 31], [19, 40, 44], [19, 46, 46],
    [20, 3, 4], [20, 8, 18], [20, 23, 25], [20, 34, 38], [20, 41, 47],
    [21, 3, 4], [21, 6, 36],
    [22, 8, 8], [22, 10, 13], [22, 15, 22], [22, 25, 38], [22, 40, 40], [22, 42, 42], [22, 46, 48], [22, 51, 52], [22, 67, 70],
    [23, 28, 31], [23, 34, 34], [23, 43, 43], [23, 46, 46],
    [24, 17, 17], [24, 19, 19], [24, 25, 26], [24, 36, 49],
  ],
  // ---- John ----
  Jhn: [
    [1, 38, 39], [1, 42, 43], [1, 47, 51],
    [2, 4, 4], [2, 7, 8], [2, 16, 16], [2, 19, 19],
    [3, 3, 21],                                   // Nicodemus
    [4, 7, 7], [4, 10, 10], [4, 13, 14], [4, 16, 16], [4, 17, 18], [4, 21, 26], [4, 32, 32], [4, 34, 38], [4, 48, 50],
    [5, 6, 6], [5, 8, 8], [5, 14, 14], [5, 17, 17], [5, 19, 47],
    [6, 5, 5], [6, 10, 10], [6, 12, 12], [6, 20, 20], [6, 26, 65], [6, 67, 67], [6, 70, 70],
    [7, 6, 8], [7, 16, 19], [7, 21, 24], [7, 28, 29], [7, 33, 34], [7, 37, 38],
    [8, 7, 7], [8, 10, 11], [8, 12, 12], [8, 14, 19], [8, 21, 21], [8, 23, 26], [8, 28, 29], [8, 31, 32], [8, 34, 38], [8, 39, 47], [8, 49, 51], [8, 54, 56], [8, 58, 58],
    [9, 3, 5], [9, 7, 7], [9, 35, 35], [9, 37, 37], [9, 39, 41],
    [10, 1, 18], [10, 25, 30], [10, 32, 32], [10, 34, 38],
    [11, 4, 4], [11, 7, 7], [11, 9, 11], [11, 14, 15], [11, 23, 23], [11, 25, 26], [11, 34, 34], [11, 39, 40], [11, 41, 44],
    [12, 7, 8], [12, 23, 32], [12, 35, 36], [12, 44, 50],
    [13, 7, 8], [13, 10, 11], [13, 12, 20], [13, 21, 21], [13, 26, 27], [13, 31, 38],
    [14, 1, 31],                                  // Upper Room
    [15, 1, 27],
    [16, 1, 33],
    [17, 1, 26],                                  // High-Priestly Prayer
    [18, 4, 4], [18, 7, 8], [18, 11, 11], [18, 20, 21], [18, 23, 23], [18, 34, 34], [18, 36, 37],
    [19, 11, 11], [19, 26, 27], [19, 28, 28], [19, 30, 30],
    [20, 15, 17], [20, 19, 19], [20, 21, 23], [20, 26, 29],
    [21, 5, 6], [21, 10, 12], [21, 15, 22],
  ],
  // ---- Acts (Jesus speaks: ascension, road to Damascus, Paul's defenses) ----
  Act: [
    [1, 4, 5], [1, 7, 8],
    [9, 4, 6], [9, 10, 16],
    [11, 16, 16],
    [18, 9, 10],
    [22, 7, 8], [22, 10, 10], [22, 18, 21],
    [23, 11, 11],
    [26, 14, 18],
  ],
  // ---- Revelation (Jesus speaks throughout; especially the letters to the
  //      seven churches and the closing chapter) ----
  Rev: [
    [1, 8, 8], [1, 11, 11], [1, 17, 20],
    [2, 1, 29],
    [3, 1, 22],
    [16, 15, 15],
    [22, 7, 7], [22, 12, 16], [22, 20, 20],
  ],
};

/**
 * Map common API.Bible / OSIS book identifiers to the keys above so callers
 * can pass whichever abbreviation they have on hand.
 */
const BOOK_ALIAS: Record<string, keyof typeof RED_RANGES> = {
  Mat: "Mat", Matt: "Mat", Mt: "Mat", Matthew: "Mat",
  Mar: "Mar", Mark: "Mar", Mk: "Mar", Mrk: "Mar",
  Luk: "Luk", Luke: "Luk", Lk: "Luk",
  Jhn: "Jhn", John: "Jhn", Jn: "Jhn", Joh: "Jhn",
  Act: "Act", Acts: "Act",
  Rev: "Rev", Revelation: "Rev", Re: "Rev",
};

function isJesusVerse(bookAbbr: string, chapter: number, verse: number): boolean {
  const key = BOOK_ALIAS[bookAbbr];
  if (!key) return false;
  const ranges = RED_RANGES[key];
  if (!ranges) return false;
  for (const [c, from, to] of ranges) {
    if (c === chapter && verse >= from && verse <= to) return true;
  }
  return false;
}

/**
 * Quote-character pairs we treat as opening / closing.
 * Matches straight + curly double quotes and curly single quotes. Straight
 * single quote/apostrophe is intentionally excluded (too ambiguous).
 */
const OPENERS = new Set(["\u201C", "\u2018", '"']);
const CLOSERS = new Set(["\u201D", "\u2019", '"']);

/**
 * Split a verse into alternating Jesus / non-Jesus segments.
 * - If the verse isn't in a Jesus-speaking range, returns one non-Jesus segment.
 * - Otherwise scans for paired quotation marks and marks the inside as Jesus.
 * - Quote characters themselves are kept in the non-Jesus segment.
 */
export function splitJesusSpeech(
  bookAbbr: string,
  chapter: number,
  verseNumber: number,
  text: string,
): Segment[] {
  if (!isJesusVerse(bookAbbr, chapter, verseNumber)) {
    return [{ text, isJesus: false }];
  }

  const out: Segment[] = [];
  let buf = "";
  let inside = false;

  const flush = (jesus: boolean) => {
    if (buf) {
      out.push({ text: buf, isJesus: jesus });
      buf = "";
    }
  };

  for (const ch of text) {
    if (!inside && OPENERS.has(ch)) {
      flush(false);
      buf += ch;            // keep the opening quote with non-Jesus
      flush(false);
      inside = true;
      continue;
    }
    if (inside && CLOSERS.has(ch)) {
      flush(true);
      buf += ch;            // keep the closing quote with non-Jesus
      flush(false);
      inside = false;
      continue;
    }
    buf += ch;
  }
  flush(inside);

  // If no quote pairs were found, we deliberately do NOT paint the entire
  // verse red. Many curated ranges include narrative verses adjacent to
  // Jesus' speech (e.g. "And he said to them,") where only the quoted span
  // is actually his words. Painting the whole verse caused false positives
  // and a "wall of red" that's hard to read. Only quoted text turns red.
  return out;
}

/** Same as splitJesusSpeech but emits raw HTML for the headless paginator. */
export function splitJesusSpeechHtml(
  bookAbbr: string,
  chapter: number,
  verseNumber: number,
  text: string,
  escape: (s: string) => string,
): string {
  const segs = splitJesusSpeech(bookAbbr, chapter, verseNumber, text);
  return segs
    .map((s) =>
      s.isJesus
        ? `<span class="red-letter">${escape(s.text)}</span>`
        : escape(s.text),
    )
    .join("");
}

/**
 * Chapter-level splitter. Walks all verses in chapter order, carrying the
 * "inside a quote" state across verse boundaries — many translations open a
 * quote in one verse and close it several verses later. Only verses that
 * are inside our curated red-letter ranges contribute red text.
 *
 * Returns a map from verse number → segments for that verse.
 */
export function splitJesusSpeechForChapter(
  bookAbbr: string,
  chapter: number,
  verses: { number: number; text: string }[],
): Map<number, Segment[]> {
  const result = new Map<number, Segment[]>();
  let inside = false; // carries across verses

  for (const v of verses) {
    const verseIsRed = isJesusVerse(bookAbbr, chapter, v.number);
    const segs: Segment[] = [];
    let buf = "";

    const flush = (jesus: boolean) => {
      if (buf) {
        segs.push({ text: buf, isJesus: jesus && verseIsRed });
        buf = "";
      }
    };

    for (const ch of v.text) {
      if (!inside && OPENERS.has(ch)) {
        flush(false);
        buf += ch;        // keep opening quote with non-Jesus
        flush(false);
        inside = true;
        continue;
      }
      if (inside && CLOSERS.has(ch)) {
        flush(true);
        buf += ch;        // keep closing quote with non-Jesus
        flush(false);
        inside = false;
        continue;
      }
      buf += ch;
    }
    // Flush remaining buffer with the current state (red iff still inside a
    // quote AND this verse is in a red range).
    flush(inside);

    result.set(v.number, segs);
  }

  return result;
}