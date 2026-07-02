/** Resolve a Tissot Commons filename / title to bookAbbr, chapter, beforeVerse. */

const BOOK_ABBR = {
  genesis: "Gen",
  exodus: "Exo",
  leviticus: "Lev",
  numbers: "Num",
  deuteronomy: "Deu",
  joshua: "Jos",
  judges: "Jdg",
  ruth: "Rut",
  samuel: "1Sa",
  "1 samuel": "1Sa",
  "2 samuel": "2Sa",
  kings: "1Ki",
  "1 kings": "1Ki",
  "2 kings": "2Ki",
  chronicles: "1Ch",
  ezra: "Ezr",
  nehemiah: "Neh",
  esther: "Est",
  job: "Job",
  psalm: "Psa",
  psalms: "Psa",
  proverbs: "Pro",
  ecclesiastes: "Ecc",
  song: "Sng",
  isaiah: "Isa",
  jeremiah: "Jer",
  ezekiel: "Ezk",
  daniel: "Dan",
  hosea: "Hos",
  joel: "Jol",
  amos: "Amo",
  jonah: "Jon",
  micah: "Mic",
  nahum: "Nah",
  habakkuk: "Hab",
  zephaniah: "Zep",
  haggai: "Hag",
  zechariah: "Zec",
  malachi: "Mal",
  matthew: "Mat",
  mark: "Mrk",
  luke: "Luk",
  john: "Jhn",
  acts: "Act",
  romans: "Rom",
  revelation: "Rev",
};

/** Curated title/filename rules (first match wins). */
const RULES = [
  // —— Life of Christ (Brooklyn watercolors) ——
  { re: /nativit|birth of our lord|nativity of/i, bookAbbr: "Mat", chapter: 2, beforeVerse: 1 },
  { re: /baptism of jesus|john baptiz|baptism.*jordan/i, bookAbbr: "Mat", chapter: 3, beforeVerse: 16 },
  { re: /sermon.*beatitudes|sermon on the mount|beatitudes/i, bookAbbr: "Mat", chapter: 5, beforeVerse: 1 },
  { re: /loaves and fishes|multiplication.*bread|miracle.*loaves/i, bookAbbr: "Mat", chapter: 14, beforeVerse: 19 },
  { re: /walks on the sea|walking on the water|marche sur la mer/i, bookAbbr: "Mat", chapter: 14, beforeVerse: 25 },
  { re: /prodigal son|retour du fils prodigue/i, bookAbbr: "Luk", chapter: 15, beforeVerse: 20 },
  { re: /lazarus|resurrection of lazarus/i, bookAbbr: "Jhn", chapter: 11, beforeVerse: 43 },
  { re: /last supper|cène|cenacle/i, bookAbbr: "Mat", chapter: 26, beforeVerse: 26 },
  { re: /crucifixion|la crucifixion/i, bookAbbr: "Mat", chapter: 27, beforeVerse: 35 },
  { re: /resurrection|resurrect.*christ|notre.*ressuscit/i, bookAbbr: "Mat", chapter: 28, beforeVerse: 5 },
  { re: /ascension|l'ascension/i, bookAbbr: "Act", chapter: 1, beforeVerse: 9 },
  { re: /pentecost|descent.*holy spirit|pentecôte/i, bookAbbr: "Act", chapter: 2, beforeVerse: 2 },
  { re: /annunciation|annonciation/i, bookAbbr: "Luk", chapter: 1, beforeVerse: 26 },
  { re: /visitation/i, bookAbbr: "Luk", chapter: 1, beforeVerse: 39 },
  { re: /magi|three kings|adoration.*magi|rois mages/i, bookAbbr: "Mat", chapter: 2, beforeVerse: 1 },
  { re: /flight into egypt|fuite en égypte/i, bookAbbr: "Mat", chapter: 2, beforeVerse: 13 },
  { re: /temptation.*desert|temptation of christ/i, bookAbbr: "Mat", chapter: 4, beforeVerse: 1 },
  { re: /transfiguration/i, bookAbbr: "Mat", chapter: 17, beforeVerse: 1 },
  { re: /triumphal entry|entry into jerusalem|entrée.*jérusalem/i, bookAbbr: "Mat", chapter: 21, beforeVerse: 9 },
  { re: /cleansing.*temple|money changers/i, bookAbbr: "Mat", chapter: 21, beforeVerse: 12 },
  { re: /garden of gethsemane|gethsemane|agonie/i, bookAbbr: "Mat", chapter: 26, beforeVerse: 36 },
  { re: /judas.*kiss|baiser de judas/i, bookAbbr: "Mat", chapter: 26, beforeVerse: 48 },
  { re: /denial.*peter|peter.*deni|coq/i, bookAbbr: "Mat", chapter: 26, beforeVerse: 69 },
  { re: /carrying.*cross|via dolorosa|condemn/i, bookAbbr: "Mat", chapter: 27, beforeVerse: 32 },
  { re: /good samaritan/i, bookAbbr: "Luk", chapter: 10, beforeVerse: 33 },
  { re: /woman at the well|samaria/i, bookAbbr: "Jhn", chapter: 4, beforeVerse: 7 },
  { re: /raising.*widow.*son|funeral.*nain/i, bookAbbr: "Luk", chapter: 7, beforeVerse: 14 },
  { re: /calming.*storm|still.*tempest/i, bookAbbr: "Mat", chapter: 8, beforeVerse: 24 },
  { re: /healing.*paralytic|paralytic.*roof/i, bookAbbr: "Mat", chapter: 9, beforeVerse: 2 },
  { re: /woman.*hem|touch.*garment/i, bookAbbr: "Mat", chapter: 9, beforeVerse: 20 },
  { re: /jairus.*daughter|daughter.*jairus/i, bookAbbr: "Mat", chapter: 9, beforeVerse: 18 },
  { re: /calling.*matthew|publican/i, bookAbbr: "Mat", chapter: 9, beforeVerse: 9 },
  { re: /wedding.*cana|marriage.*cana/i, bookAbbr: "Jhn", chapter: 2, beforeVerse: 1 },
  { re: /cleansing.*leper/i, bookAbbr: "Mat", chapter: 8, beforeVerse: 1 },
  { re: /barabbas/i, bookAbbr: "Mat", chapter: 27, beforeVerse: 15 },
  { re: /road to emmaus|emmaus/i, bookAbbr: "Luk", chapter: 24, beforeVerse: 13 },
  { re: /doubting thomas|incredulity/i, bookAbbr: "Jhn", chapter: 20, beforeVerse: 24 },
  { re: /ascension/i, bookAbbr: "Act", chapter: 1, beforeVerse: 9 },
  { re: /healing.*blind|blind.*bartimaeus/i, bookAbbr: "Mat", chapter: 20, beforeVerse: 30 },
  { re: /zaccheus/i, bookAbbr: "Luk", chapter: 19, beforeVerse: 2 },
  { re: /pharisee.*publican|tax collector.*prayer/i, bookAbbr: "Luk", chapter: 18, beforeVerse: 10 },

  // —— Old Testament (English / Google Art titles) ——
  { re: /adam and eve.*paradise|driven from paradise|expulsion.*eden/i, bookAbbr: "Gen", chapter: 3, beforeVerse: 23 },
  { re: /cain.*abel|abel.*death/i, bookAbbr: "Gen", chapter: 4, beforeVerse: 8 },
  { re: /birth of noah|noah.*born/i, bookAbbr: "Gen", chapter: 5, beforeVerse: 32 },
  { re: /sacrifice of noah|noah.*sacrifice/i, bookAbbr: "Gen", chapter: 8, beforeVerse: 20 },
  { re: /ark.*over the jordan|passes over the jordan/i, bookAbbr: "Jos", chapter: 3, beforeVerse: 14 },
  { re: /caravan of abram|abraham.*journey/i, bookAbbr: "Gen", chapter: 12, beforeVerse: 1 },
  { re: /rebecca meets isaac|rebecca.*isaac/i, bookAbbr: "Gen", chapter: 24, beforeVerse: 65 },
  { re: /joseph dwelleth|joseph.*egypt/i, bookAbbr: "Gen", chapter: 39, beforeVerse: 1 },
  { re: /jacob.*dream|jacob's dream|jacobs dream/i, bookAbbr: "Gen", chapter: 28, beforeVerse: 12 },
  { re: /dinah/i, bookAbbr: "Gen", chapter: 34, beforeVerse: 1 },
  { re: /judah and tamar/i, bookAbbr: "Gen", chapter: 38, beforeVerse: 1 },
  { re: /david mourns.*amnon|death of amnon|desolation of tamar/i, bookAbbr: "2Sa", chapter: 13, beforeVerse: 1 },
  { re: /david returns to achish/i, bookAbbr: "1Sa", chapter: 27, beforeVerse: 1 },
  { re: /jephthah.*daughter/i, bookAbbr: "Jdg", chapter: 11, beforeVerse: 34 },
  { re: /hosea/i, bookAbbr: "Hos", chapter: 1, beforeVerse: 1 },
];

const SKIP_RE =
  /street in|typical woman|typical man|armenian|ancient tombs|album of sketches|types of jew|type of jew|well near|palms of|costumes|study for\b|preliminary sketch|a street|portrait of|landscape|view of jerusalem|view of|ethnograph|jewish type|mosque|synagogue exterior|dervish|kedron bridge|album of/i;

export function shouldSkipTissotFile(filename) {
  return SKIP_RE.test(filename);
}

export function cleanTissotTitle(filename, objectName) {
  if (objectName) return objectName.replace(/<[^>]+>/g, "").trim();
  let t = filename.replace(/\.(jpg|jpeg|png)$/i, "");
  t = t.replace(/^Brooklyn Museum - /, "");
  t = t.replace(/ - James Tissot.*$/i, "");
  t = t.replace(/ \(La .+\)$/i, "");
  t = t.replace(/ - overall$/i, "");
  t = t.replace(/^[\d.]+ \d+ /, "");
  t = t.replace(/ • .+$/, "");
  return t.trim();
}

/** Parse "(Genesis 22 6)" or "(Genesis 41 2,5)" from Medhurst-style filenames. */
export function parseParentheticalReference(text) {
  const m = text.match(/\(([A-Za-z][A-Za-z ]*) (\d+) (\d+(?:,\d+)?)\)/);
  if (!m) return null;
  const bookKey = m[1].trim().toLowerCase();
  const bookAbbr = BOOK_ABBR[bookKey];
  if (!bookAbbr) return null;
  const chapter = Number(m[2]);
  const versePart = m[3].split(",")[0];
  const beforeVerse = Number(versePart);
  if (!chapter || !beforeVerse) return null;
  return { bookAbbr, chapter, beforeVerse };
}

export function resolveTissotPassage(filename, objectName = "") {
  const haystack = `${filename} ${objectName}`.toLowerCase();

  const parsed = parseParentheticalReference(filename);
  if (parsed) return parsed;

  for (const rule of RULES) {
    if (rule.re.test(haystack)) {
      return {
        bookAbbr: rule.bookAbbr,
        chapter: rule.chapter,
        beforeVerse: rule.beforeVerse,
      };
    }
  }

  return null;
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function parseBrooklynAccession(credit) {
  if (!credit) return null;
  const m = credit.match(/(00\.\d+\.\d+)_PS\d\.jpg/i);
  return m?.[1] ?? null;
}

export function bookReferenceLabel(bookAbbr, chapter, beforeVerse) {
  return `${bookAbbr} ${chapter}:${beforeVerse}`;
}
