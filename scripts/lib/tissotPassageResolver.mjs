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
  { re: /sleeping during the tempest|dormant pendant la tempête/i, bookAbbr: "Mat", chapter: 8, beforeVerse: 24 },
  { re: /in the sepulchre|dans le sépulcre/i, bookAbbr: "Mat", chapter: 27, beforeVerse: 59 },
  { re: /leaves the praetorium|quitte le pretoire/i, bookAbbr: "Mat", chapter: 27, beforeVerse: 11 },
  { re: /led from caiaphas|caiaphas to pilate|conduit de caïphe/i, bookAbbr: "Mat", chapter: 27, beforeVerse: 2 },
  { re: /led from herod|hérode à pilate/i, bookAbbr: "Luk", chapter: 23, beforeVerse: 11 },
  { re: /meets his mother|rencontre sa mère/i, bookAbbr: "Luk", chapter: 23, beforeVerse: 27 },
  { re: /ministered to by angels|assisté par les anges/i, bookAbbr: "Mat", chapter: 4, beforeVerse: 11 },
  { re: /preaches in a ship|prèche dans une barque|seashore and preaches|bord de la mer/i, bookAbbr: "Mat", chapter: 13, beforeVerse: 1 },
  { re: /heals the blind and lame|guérit les aveugles/i, bookAbbr: "Mat", chapter: 15, beforeVerse: 30 },
  { re: /heals a mute possessed|guérit un possédé muet/i, bookAbbr: "Mat", chapter: 9, beforeVerse: 32 },
  { re: /martha at bethany|marie madeleine et marthe|mary magdalene.*martha/i, bookAbbr: "Jhn", chapter: 11, beforeVerse: 1 },
  { re: /stripped of his clothing|dépouillé/i, bookAbbr: "Mat", chapter: 27, beforeVerse: 28 },
  { re: /holy woman wipes|essuie le visage/i, bookAbbr: "Luk", chapter: 23, beforeVerse: 27 },
  { re: /magi arrive|arrivée des mages|adore the infant|adorent l'enfant/i, bookAbbr: "Mat", chapter: 2, beforeVerse: 11 },
  { re: /massacre of the innocents|massacre des innocents/i, bookAbbr: "Mat", chapter: 2, beforeVerse: 16 },
  { re: /presentation in the temple|présentation au temple/i, bookAbbr: "Luk", chapter: 2, beforeVerse: 22 },
  { re: /finding in the temple|trouvé au temple/i, bookAbbr: "Luk", chapter: 2, beforeVerse: 46 },
  { re: /calling.*apostles|choix des apôtres|fishers of men|pêcheurs d'hommes/i, bookAbbr: "Mat", chapter: 4, beforeVerse: 18 },
  { re: /healing.*leper|guérison.*lépreux/i, bookAbbr: "Mat", chapter: 8, beforeVerse: 1 },
  { re: /healing.*servant.*centurion|centurion/i, bookAbbr: "Mat", chapter: 8, beforeVerse: 5 },
  { re: /widow.*nain|veuve de naïn/i, bookAbbr: "Luk", chapter: 7, beforeVerse: 12 },
  { re: /sends out.*apostles|envoie les apôtres/i, bookAbbr: "Mat", chapter: 10, beforeVerse: 5 },
  { re: /feeds.*four thousand|quatre mille/i, bookAbbr: "Mat", chapter: 15, beforeVerse: 32 },
  { re: /transfiguration/i, bookAbbr: "Mat", chapter: 17, beforeVerse: 1 },
  { re: /children.*bless|petits enfants/i, bookAbbr: "Mat", chapter: 19, beforeVerse: 13 },
  { re: /rich young man|jeune homme riche/i, bookAbbr: "Mat", chapter: 19, beforeVerse: 16 },
  { re: /cleansing.*temple|expulse.*temple/i, bookAbbr: "Mat", chapter: 21, beforeVerse: 12 },
  { re: /widow.*mite|veuve.*obole/i, bookAbbr: "Luk", chapter: 21, beforeVerse: 1 },
  { re: /institution.*eucharist|institution.*sacrament/i, bookAbbr: "Mat", chapter: 26, beforeVerse: 26 },
  { re: /agony in the garden|agonie.*jardin|gethsemane/i, bookAbbr: "Mat", chapter: 26, beforeVerse: 36 },
  { re: /mocked by soldiers|soldats.*moquent/i, bookAbbr: "Mat", chapter: 27, beforeVerse: 27 },
  { re: /crown of thorns|couronne d'épines/i, bookAbbr: "Mat", chapter: 27, beforeVerse: 29 },
  { re: /road to calvary|montée au calvaire|fall under the cross/i, bookAbbr: "Mat", chapter: 27, beforeVerse: 32 },
  { re: /entombment|mise au tombeau/i, bookAbbr: "Mat", chapter: 27, beforeVerse: 57 },
  { re: /women at the tomb|femmes au tombeau/i, bookAbbr: "Mat", chapter: 28, beforeVerse: 1 },
  { re: /appearance.*disciples|apparition.*disciples|upper room/i, bookAbbr: "Jhn", chapter: 20, beforeVerse: 19 },
  { re: /breakfast.*shore|petit déjeuner.*rivage|charcoal fire/i, bookAbbr: "Jhn", chapter: 21, beforeVerse: 9 },
  { re: /healing.*paralytic.*roof|paralytique.*toit/i, bookAbbr: "Mrk", chapter: 2, beforeVerse: 3 },
  { re: /healing.*man.*hand|main desséchée/i, bookAbbr: "Mrk", chapter: 3, beforeVerse: 1 },
  { re: /still.*storm|tempête.*apais/i, bookAbbr: "Mrk", chapter: 4, beforeVerse: 39 },

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
  { re: /lot.*daughter|filles de lot/i, bookAbbr: "Gen", chapter: 19, beforeVerse: 30 },
  { re: /hagar.*abraham|agar quitte/i, bookAbbr: "Gen", chapter: 21, beforeVerse: 14 },
  { re: /ishmael.*bow|ismaël.*arc/i, bookAbbr: "Gen", chapter: 21, beforeVerse: 20 },
  { re: /isaac.*wood|isaac porte le bois/i, bookAbbr: "Gen", chapter: 22, beforeVerse: 6 },
  { re: /sacrifice.*abraham|sacrifice d'abraham/i, bookAbbr: "Gen", chapter: 22, beforeVerse: 9 },
  { re: /servant.*rebecca|rébecca.*serviteur/i, bookAbbr: "Gen", chapter: 24, beforeVerse: 17 },
  { re: /rebecca.*isaac|rébecca.*isaac/i, bookAbbr: "Gen", chapter: 24, beforeVerse: 65 },
  { re: /isaac.*esau|esau.*isaac|jacob.*esau/i, bookAbbr: "Gen", chapter: 27, beforeVerse: 21 },
  { re: /jacob.*ladder|échelle.*jacob|songe de jacob/i, bookAbbr: "Gen", chapter: 28, beforeVerse: 12 },
  { re: /joseph.*brothers|joseph.*frères|joseph sold/i, bookAbbr: "Gen", chapter: 37, beforeVerse: 28 },
  { re: /pharaoh.*dream|songe.*pharaon|vaches.*épis/i, bookAbbr: "Gen", chapter: 41, beforeVerse: 1 },
  { re: /moses.*basket|moïse.*panier|moise.*panier/i, bookAbbr: "Exo", chapter: 2, beforeVerse: 3 },
  { re: /burning bush|buisson ardent/i, bookAbbr: "Exo", chapter: 3, beforeVerse: 2 },
  { re: /passover|pâque/i, bookAbbr: "Exo", chapter: 12, beforeVerse: 1 },
  { re: /crossing.*red sea|mer rouge/i, bookAbbr: "Exo", chapter: 14, beforeVerse: 21 },
  { re: /ten commandments|décalogue|tables.*loi/i, bookAbbr: "Exo", chapter: 20, beforeVerse: 1 },
  { re: /golden calf|veau d'or/i, bookAbbr: "Exo", chapter: 32, beforeVerse: 1 },
  { re: /spies.*canaan|espions.*canaan/i, bookAbbr: "Num", chapter: 13, beforeVerse: 17 },
  { re: /brazen serpent|serpent d'airain/i, bookAbbr: "Num", chapter: 21, beforeVerse: 9 },
  { re: /balaam|balaam/i, bookAbbr: "Num", chapter: 22, beforeVerse: 1 },
  { re: /ruth.*boaz|ruth.*glan/i, bookAbbr: "Rut", chapter: 2, beforeVerse: 1 },
  { re: /samuel.*eli|samuel.*temple/i, bookAbbr: "1Sa", chapter: 3, beforeVerse: 1 },
  { re: /david.*goliath|goliath/i, bookAbbr: "1Sa", chapter: 17, beforeVerse: 48 },
  { re: /david.*bathsheba|bethsabée/i, bookAbbr: "2Sa", chapter: 11, beforeVerse: 2 },
  { re: /solomon.*judgment|jugement.*salomon/i, bookAbbr: "1Ki", chapter: 3, beforeVerse: 16 },
  { re: /elijah.*carmel|carmel/i, bookAbbr: "1Ki", chapter: 18, beforeVerse: 20 },
  { re: /elijah.*ravens|corbeaux/i, bookAbbr: "1Ki", chapter: 17, beforeVerse: 4 },
  { re: /fiery furnace|fournaise/i, bookAbbr: "Dan", chapter: 3, beforeVerse: 19 },
  { re: /daniel.*lions|fosse aux lions/i, bookAbbr: "Dan", chapter: 6, beforeVerse: 16 },
  { re: /jonah.*whale|jonas.*baleine|jonah.*fish/i, bookAbbr: "Jon", chapter: 1, beforeVerse: 17 },
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

export function resolveTissotPassage(filename, objectName = "", credit = "") {
  const accession = extractBrooklynAccession(credit, filename);
  if (accession != null) {
    const brooklyn = passageForBrooklynAccession(accession);
    if (brooklyn) return brooklyn;
  }

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

import {
  extractBrooklynAccession,
  passageForBrooklynAccession,
} from "./brooklynAccessionPassage.mjs";

export function parseBrooklynAccession(credit, filename = "") {
  return extractBrooklynAccession(credit, filename);
}

export function bookReferenceLabel(bookAbbr, chapter, beforeVerse) {
  return `${bookAbbr} ${chapter}:${beforeVerse}`;
}
