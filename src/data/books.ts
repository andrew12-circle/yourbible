// Canonical Protestant 66-book ordering with section grouping and short codes.
// abbr3 is what we render in the side tabs.
export type BibleSection =
  | "law" | "history" | "poetry" | "prophets"
  | "gospels" | "acts" | "epistles" | "revelation";

export interface BibleBook {
  /** Full English name */
  name: string;
  /** 3-letter abbreviation used in side tabs */
  abbr: string;
  /** Number of chapters */
  chapters: number;
  /** Section grouping */
  section: BibleSection;
  /** Testament */
  testament: "OT" | "NT";
}

export const BOOKS: BibleBook[] = [
  // --- Law ---
  { name: "Genesis", abbr: "Gen", chapters: 50, section: "law", testament: "OT" },
  { name: "Exodus", abbr: "Exo", chapters: 40, section: "law", testament: "OT" },
  { name: "Leviticus", abbr: "Lev", chapters: 27, section: "law", testament: "OT" },
  { name: "Numbers", abbr: "Num", chapters: 36, section: "law", testament: "OT" },
  { name: "Deuteronomy", abbr: "Deu", chapters: 34, section: "law", testament: "OT" },
  // --- History ---
  { name: "Joshua", abbr: "Jos", chapters: 24, section: "history", testament: "OT" },
  { name: "Judges", abbr: "Jdg", chapters: 21, section: "history", testament: "OT" },
  { name: "Ruth", abbr: "Rut", chapters: 4, section: "history", testament: "OT" },
  { name: "1 Samuel", abbr: "1Sa", chapters: 31, section: "history", testament: "OT" },
  { name: "2 Samuel", abbr: "2Sa", chapters: 24, section: "history", testament: "OT" },
  { name: "1 Kings", abbr: "1Ki", chapters: 22, section: "history", testament: "OT" },
  { name: "2 Kings", abbr: "2Ki", chapters: 25, section: "history", testament: "OT" },
  { name: "1 Chronicles", abbr: "1Ch", chapters: 29, section: "history", testament: "OT" },
  { name: "2 Chronicles", abbr: "2Ch", chapters: 36, section: "history", testament: "OT" },
  { name: "Ezra", abbr: "Ezr", chapters: 10, section: "history", testament: "OT" },
  { name: "Nehemiah", abbr: "Neh", chapters: 13, section: "history", testament: "OT" },
  { name: "Esther", abbr: "Est", chapters: 10, section: "history", testament: "OT" },
  // --- Poetry ---
  { name: "Job", abbr: "Job", chapters: 42, section: "poetry", testament: "OT" },
  { name: "Psalms", abbr: "Psa", chapters: 150, section: "poetry", testament: "OT" },
  { name: "Proverbs", abbr: "Pro", chapters: 31, section: "poetry", testament: "OT" },
  { name: "Ecclesiastes", abbr: "Ecc", chapters: 12, section: "poetry", testament: "OT" },
  { name: "Song of Solomon", abbr: "Sng", chapters: 8, section: "poetry", testament: "OT" },
  // --- Prophets ---
  { name: "Isaiah", abbr: "Isa", chapters: 66, section: "prophets", testament: "OT" },
  { name: "Jeremiah", abbr: "Jer", chapters: 52, section: "prophets", testament: "OT" },
  { name: "Lamentations", abbr: "Lam", chapters: 5, section: "prophets", testament: "OT" },
  { name: "Ezekiel", abbr: "Ezk", chapters: 48, section: "prophets", testament: "OT" },
  { name: "Daniel", abbr: "Dan", chapters: 12, section: "prophets", testament: "OT" },
  { name: "Hosea", abbr: "Hos", chapters: 14, section: "prophets", testament: "OT" },
  { name: "Joel", abbr: "Jol", chapters: 3, section: "prophets", testament: "OT" },
  { name: "Amos", abbr: "Amo", chapters: 9, section: "prophets", testament: "OT" },
  { name: "Obadiah", abbr: "Oba", chapters: 1, section: "prophets", testament: "OT" },
  { name: "Jonah", abbr: "Jon", chapters: 4, section: "prophets", testament: "OT" },
  { name: "Micah", abbr: "Mic", chapters: 7, section: "prophets", testament: "OT" },
  { name: "Nahum", abbr: "Nam", chapters: 3, section: "prophets", testament: "OT" },
  { name: "Habakkuk", abbr: "Hab", chapters: 3, section: "prophets", testament: "OT" },
  { name: "Zephaniah", abbr: "Zep", chapters: 3, section: "prophets", testament: "OT" },
  { name: "Haggai", abbr: "Hag", chapters: 2, section: "prophets", testament: "OT" },
  { name: "Zechariah", abbr: "Zec", chapters: 14, section: "prophets", testament: "OT" },
  { name: "Malachi", abbr: "Mal", chapters: 4, section: "prophets", testament: "OT" },
  // --- Gospels ---
  { name: "Matthew", abbr: "Mat", chapters: 28, section: "gospels", testament: "NT" },
  { name: "Mark", abbr: "Mrk", chapters: 16, section: "gospels", testament: "NT" },
  { name: "Luke", abbr: "Luk", chapters: 24, section: "gospels", testament: "NT" },
  { name: "John", abbr: "Jhn", chapters: 21, section: "gospels", testament: "NT" },
  // --- Acts ---
  { name: "Acts", abbr: "Act", chapters: 28, section: "acts", testament: "NT" },
  // --- Epistles ---
  { name: "Romans", abbr: "Rom", chapters: 16, section: "epistles", testament: "NT" },
  { name: "1 Corinthians", abbr: "1Co", chapters: 16, section: "epistles", testament: "NT" },
  { name: "2 Corinthians", abbr: "2Co", chapters: 13, section: "epistles", testament: "NT" },
  { name: "Galatians", abbr: "Gal", chapters: 6, section: "epistles", testament: "NT" },
  { name: "Ephesians", abbr: "Eph", chapters: 6, section: "epistles", testament: "NT" },
  { name: "Philippians", abbr: "Php", chapters: 4, section: "epistles", testament: "NT" },
  { name: "Colossians", abbr: "Col", chapters: 4, section: "epistles", testament: "NT" },
  { name: "1 Thessalonians", abbr: "1Th", chapters: 5, section: "epistles", testament: "NT" },
  { name: "2 Thessalonians", abbr: "2Th", chapters: 3, section: "epistles", testament: "NT" },
  { name: "1 Timothy", abbr: "1Ti", chapters: 6, section: "epistles", testament: "NT" },
  { name: "2 Timothy", abbr: "2Ti", chapters: 4, section: "epistles", testament: "NT" },
  { name: "Titus", abbr: "Tit", chapters: 3, section: "epistles", testament: "NT" },
  { name: "Philemon", abbr: "Phm", chapters: 1, section: "epistles", testament: "NT" },
  { name: "Hebrews", abbr: "Heb", chapters: 13, section: "epistles", testament: "NT" },
  { name: "James", abbr: "Jas", chapters: 5, section: "epistles", testament: "NT" },
  { name: "1 Peter", abbr: "1Pe", chapters: 5, section: "epistles", testament: "NT" },
  { name: "2 Peter", abbr: "2Pe", chapters: 3, section: "epistles", testament: "NT" },
  { name: "1 John", abbr: "1Jn", chapters: 5, section: "epistles", testament: "NT" },
  { name: "2 John", abbr: "2Jn", chapters: 1, section: "epistles", testament: "NT" },
  { name: "3 John", abbr: "3Jn", chapters: 1, section: "epistles", testament: "NT" },
  { name: "Jude", abbr: "Jud", chapters: 1, section: "epistles", testament: "NT" },
  // --- Revelation ---
  { name: "Revelation", abbr: "Rev", chapters: 22, section: "revelation", testament: "NT" },
];

export const SECTION_LABELS: Record<BibleSection, string> = {
  law: "Law",
  history: "History",
  poetry: "Poetry",
  prophets: "Prophets",
  gospels: "Gospels",
  acts: "Acts",
  epistles: "Epistles",
  revelation: "Revelation",
};

export function findBookByAbbr(abbr: string) {
  return BOOKS.find(b => b.abbr.toLowerCase() === abbr.toLowerCase());
}

export function findBookByName(name: string) {
  return BOOKS.find(b => b.name.toLowerCase() === name.toLowerCase());
}
