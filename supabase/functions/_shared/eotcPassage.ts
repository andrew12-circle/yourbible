/** EOTC Amharic Bible — https://github.com/EOTCOpenSource/80-weahadu */

const EOTC_BASE =
  "https://raw.githubusercontent.com/EOTCOpenSource/80-weahadu/main/minified/singleChapter/";

/** Book abbr → JSON filename (81-book Ethiopian Orthodox canon). */
export const EOTC_BOOK_FILES: Record<string, string> = {
  Gen: "01-genesis.json",
  Exo: "02-exodus.json",
  Lev: "03-leviticus.json",
  Num: "04-numbers.json",
  Deu: "05-deuteronomy.json",
  Jos: "06-joshua.json",
  Jdg: "07-judges.json",
  Rut: "08-ruth.json",
  "1Sa": "09-1samuel.json",
  "2Sa": "10-2 samuel.json",
  "1Ki": "11-1 kings.json",
  "2Ki": "12-2 kings.json",
  "1Ch": "13-1 chronicles.json",
  "2Ch": "14-2 chronicles.json",
  Jub: "15-kufale.json",
  Eno: "16-enoch.json",
  Ezr: "17-ezra.json",
  Neh: "18-nehemiah.json",
  E3r: "19-ezrasutuel.json",
  E2r: "20-ezrakale.json",
  Tob: "21-tobit.json",
  Jdt: "22-yodit.json",
  Est: "23-esther.json",
  "1Mq": "24-1 maccabees.json",
  "2Mq": "25-2 maccabees.json",
  "3Mq": "26-3 maccabees.json",
  Job: "27-job.json",
  Psa: "28-psalms.json",
  Pro: "29-proverbs.json",
  Adm: "30-admonition.json",
  Wis: "31-wisdom of solomon.json",
  Ecc: "32-ecclesiastes.json",
  Sng: "33-song of solomon.json",
  Sir: "34-sirach.json",
  Isa: "35-isaiah.json",
  Jer: "36-jeremiah.json",
  Bar: "37-Baruch.json",
  Lam: "38-lamentations.json",
  LJr: "39-terefermias.json",
  TBr: "40-Teref Baruch.json",
  Ezk: "41-ezekiel.json",
  Dan: "42-daniel.json",
  Hos: "43-hosea.json",
  Amo: "44-amos.json",
  Mic: "45-micah.json",
  Jol: "46-joel.json",
  Oba: "47-obadiah.json",
  Jon: "48-jonah.json",
  Nam: "49-nahum.json",
  Hab: "50-habakkuk.json",
  Zep: "51-zephaniah.json",
  Hag: "52-haggai.json",
  Zec: "53-zechariah.json",
  Mal: "54-malachi.json",
  Mat: "55-matthew.json",
  Mrk: "56-mark.json",
  Luk: "57-luke.json",
  Jhn: "58-john.json",
  Act: "59-act.json",
  Rom: "60-romans.json",
  "1Co": "61-1_corinthians.json",
  "2Co": "62-2_corinthians.json",
  Gal: "63-galatians.json",
  Eph: "64-ephesians.json",
  Php: "65-philippians.json",
  Col: "66-colossians.json",
  "1Th": "67-1_thessalonians.json",
  "2Th": "68-2_thessalonians.json",
  "1Ti": "69-1_timothy.json",
  "2Ti": "70-2_timothy.json",
  Tit: "71-titus.json",
  Phm: "72-philemon.json",
  Heb: "73-hebrews.json",
  "1Pe": "74-1_peter.json",
  "2Pe": "75-2_peter.json",
  "1Jn": "76-1_john.json",
  "2Jn": "77-2_john.json",
  "3Jn": "78-3-john.json",
  Jas: "79-james.json",
  Jud: "80-jude.json",
  Rev: "81-revelation.json",
};

interface EotcVerse {
  verse: number;
  text: string;
}

interface EotcSection {
  title?: string;
  verses: EotcVerse[];
}

interface EotcChapter {
  chapter: number;
  sections: EotcSection[];
}

interface EotcBook {
  book_name_en?: string;
  book_name_am?: string;
  chapters: EotcChapter[];
}

export interface PassageVerse {
  number: number;
  text: string;
}

export interface PassageHeading {
  beforeVerse: number;
  text: string;
}

export interface EotcPassage {
  reference: string;
  verses: PassageVerse[];
  paragraphStarts: number[];
  headings: PassageHeading[];
}

const bookCache = new Map<string, EotcBook>();

export async function fetchEotcPassage(
  bookAbbr: string,
  chapterNum: number,
): Promise<EotcPassage> {
  const file = EOTC_BOOK_FILES[bookAbbr];
  if (!file) {
    throw new Error(`Unknown Ethiopian book: ${bookAbbr}`);
  }

  let book = bookCache.get(file);
  if (!book) {
    const r = await fetch(`${EOTC_BASE}${file}`);
    if (!r.ok) throw new Error(`EOTC fetch failed: ${r.status}`);
    book = (await r.json()) as EotcBook;
    bookCache.set(file, book);
  }

  const chapter = book.chapters.find((c) => c.chapter === chapterNum);
  if (!chapter) {
    throw new Error(`Chapter ${chapterNum} not found in ${bookAbbr}`);
  }

  const verses: PassageVerse[] = [];
  const paragraphStarts: number[] = [];
  const headings: PassageHeading[] = [];
  const bookLabel = book.book_name_am ?? book.book_name_en ?? bookAbbr;

  for (const section of chapter.sections ?? []) {
    const title = (section.title ?? "").trim();
    const sectionVerses = section.verses ?? [];
    if (sectionVerses.length === 0) continue;

    const firstNum = sectionVerses[0]!.verse;
    paragraphStarts.push(firstNum);
    if (title) {
      headings.push({ beforeVerse: firstNum, text: title });
    }

    for (const v of sectionVerses) {
      verses.push({ number: v.verse, text: (v.text ?? "").trim() });
    }
  }

  if (paragraphStarts.length === 0 && verses.length > 0) {
    paragraphStarts.push(verses[0]!.number);
  }

  return {
    reference: `${bookLabel} ${chapterNum}`,
    verses,
    paragraphStarts,
    headings,
  };
}
