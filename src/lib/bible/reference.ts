/** Parse human-readable refs (e.g. "Romans 8:28-30") into reader routes. */

const BOOK_MAP: Record<string, string> = {
  genesis: "Gen", gen: "Gen",
  exodus: "Exo", exo: "Exo",
  leviticus: "Lev", lev: "Lev",
  numbers: "Num", num: "Num",
  deuteronomy: "Deu", deu: "Deu",
  joshua: "Jos", jos: "Jos",
  judges: "Jdg", jdg: "Jdg",
  ruth: "Rut", rut: "Rut",
  "1samuel": "1Sa", "1sa": "1Sa",
  "2samuel": "2Sa", "2sa": "2Sa",
  "1kings": "1Ki", "1ki": "1Ki",
  "2kings": "2Ki", "2ki": "2Ki",
  "1chronicles": "1Ch", "1ch": "1Ch",
  "2chronicles": "2Ch", "2ch": "2Ch",
  ezra: "Ezr", ezr: "Ezr",
  nehemiah: "Neh", neh: "Neh",
  esther: "Est", est: "Est",
  job: "Job",
  psalms: "Psa", psalm: "Psa", psa: "Psa",
  proverbs: "Pro", pro: "Pro",
  ecclesiastes: "Ecc", ecc: "Ecc",
  songofsongs: "Sng", song: "Sng", sng: "Sng",
  isaiah: "Isa", isa: "Isa",
  jeremiah: "Jer", jer: "Jer",
  lamentations: "Lam", lam: "Lam",
  ezekiel: "Ezk", eze: "Ezk", ezk: "Ezk",
  daniel: "Dan", dan: "Dan",
  hosea: "Hos", hos: "Hos",
  joel: "Jol", jol: "Jol",
  amos: "Amo", amo: "Amo",
  obadiah: "Oba", oba: "Oba",
  jonah: "Jon", jon: "Jon",
  micah: "Mic", mic: "Mic",
  nahum: "Nam", nam: "Nam",
  habakkuk: "Hab", hab: "Hab",
  zephaniah: "Zep", zep: "Zep",
  haggai: "Hag", hag: "Hag",
  zechariah: "Zec", zec: "Zec",
  malachi: "Mal", mal: "Mal",
  matthew: "Mat", mat: "Mat",
  mark: "Mrk", mrk: "Mrk",
  luke: "Luk", luk: "Luk",
  john: "Jhn", jhn: "Jhn",
  acts: "Act", act: "Act",
  romans: "Rom", rom: "Rom",
  "1corinthians": "1Co", "1co": "1Co",
  "2corinthians": "2Co", "2co": "2Co",
  galatians: "Gal", gal: "Gal",
  ephesians: "Eph", eph: "Eph",
  philippians: "Php", php: "Php",
  colossians: "Col", col: "Col",
  "1thessalonians": "1Th", "1th": "1Th",
  "2thessalonians": "2Th", "2th": "2Th",
  "1timothy": "1Ti", "1ti": "1Ti",
  "2timothy": "2Ti", "2ti": "2Ti",
  titus: "Tit", tit: "Tit",
  philemon: "Phm", phm: "Phm",
  hebrews: "Heb", heb: "Heb",
  james: "Jas", jas: "Jas",
  "1peter": "1Pe", "1pe": "1Pe",
  "2peter": "2Pe", "2pe": "2Pe",
  "1john": "1Jn", "1jn": "1Jn",
  "2john": "2Jn", "2jn": "2Jn",
  "3john": "3Jn", "3jn": "3Jn",
  jude: "Jud", jud: "Jud",
  revelation: "Rev", rev: "Rev",
};

function normalizeBookToken(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/\./g, "").toLowerCase();
}

export function guessBookAbbr(ref: string): string {
  const m = ref.match(/^((?:\d\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)?)/);
  if (!m) return "Jhn";
  const key = normalizeBookToken(m[1]);
  return BOOK_MAP[key] ?? "Jhn";
}

export function guessChapter(ref: string): number {
  const m = ref.match(/(\d+)\s*:/);
  return m ? Number(m[1]) : 1;
}

export function guessVerseStart(ref: string): number {
  const m = ref.match(/:(\d+)/);
  return m ? Number(m[1]) : 1;
}

export function guessVerseEnd(ref: string): number | null {
  const m = ref.match(/:(\d+)\s*[-–]\s*(\d+)/);
  return m ? Number(m[2]) : null;
}

export function readerPath(reference: string): string {
  const bookAbbr = guessBookAbbr(reference);
  const chapter = guessChapter(reference);
  const verse = guessVerseStart(reference);
  const qs = verse > 1 ? `?v=${verse}` : "";
  return `/read/${bookAbbr}/${chapter}${qs}`;
}
