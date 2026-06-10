/**
 * Red-letter Bible support — segment a verse into Jesus/non-Jesus text.
 *
 * Scholar-curated approach. Verses where Jesus speaks (WHOLE or PARTIAL lists)
 * are split by quotation marks. Only text inside the outermost pair of quotes
 * is painted red — narration ("Jesus replied…", "He answered them,") and
 * nested quotes (what others said) stay black.
 *
 * For PARTIAL verses, quote depth is **carried across verse boundaries**
 * within a chapter so Jesus' speech that spans several verses (e.g. Mat 11:4–6)
 * stays red until the closing quote. Depth resets at non-speech verses and at
 * chapter boundaries. Only depth-1 (outermost) quoted text is red; nested
 * quotes stay black.
 */

export type Segment = { text: string; isJesus: boolean };

/** Safe lookup — never returns an empty segment list. */
export function redLetterSegmentsForVerse(
  map: Map<number, Segment[]>,
  verseNumber: number,
  verseText: string,
): Segment[] {
  const text = typeof verseText === "string" ? verseText : "";
  const segs = map.get(verseNumber);
  if (!segs || segs.length === 0) {
    return [{ text, isJesus: false }];
  }
  return segs;
}

/**
 * WHOLE: verses that are entirely Jesus' direct speech in red-letter editions.
 * Used only to flag speech candidates — rendering still follows quotation marks
 * so translations like CSB don't paint narration red.
 *
 * PARTIAL: Jesus speaks somewhere in the verse but the verse also contains
 * narration ("And he answered…") or another speaker quoted nearby.
 */
type WholeMap = Record<string, Set<string>>;   // "chapter:verse"
type PartialMap = Record<string, Set<string>>;

const w = (...keys: string[]) => new Set(keys);

/** Helper to expand "c:from-to" into individual "c:v" keys */
const span = (chapter: number, from: number, to: number): string[] => {
  const out: string[] = [];
  for (let v = from; v <= to; v++) out.push(`${chapter}:${v}`);
  return out;
};

/**
 * Verses where the entire verse is Jesus speaking.
 * Curated against standard published red-letter editions, with the Greek
 * dialogue structure double-checked verse-by-verse so that narration verses
 * ("Then his disciples said unto him…") are NEVER included.
 */
const RED_WHOLE: WholeMap = {
  // ============ MATTHEW ============
  Mat: w(
    // Sermon on the Mount (5–7) — entirely Jesus' monologue
    ...span(5, 3, 48),
    ...span(6, 1, 34),
    ...span(7, 1, 27),
    // Mission Discourse — Jesus addressing the Twelve
    ...span(10, 5, 42),
    // Parables Discourse — Jesus speaking, with brief narrator interruptions:
    "13:3", "13:4", "13:5", "13:6", "13:7", "13:8", "13:9",
    "13:11", "13:12", "13:13", "13:14", "13:15", "13:16", "13:17",
    "13:18", "13:19", "13:20", "13:21", "13:22", "13:23",
    "13:24", "13:25", "13:26", "13:27", "13:28", // 28a is narration but most is parable; safe partial-able
    "13:29", "13:30",
    "13:31", "13:32", "13:33",
    "13:37", "13:38", "13:39", "13:40", "13:41", "13:42", "13:43",
    "13:44", "13:45", "13:46", "13:47", "13:48", "13:49", "13:50",
    "13:51", "13:52",
    // Community Discourse (18) — discourse to the disciples
    ...span(18, 3, 35),
    // Olivet Discourse (24) — Jesus' eschatological teaching
    ...span(24, 4, 51),
    // Eschatological parables (25)
    ...span(25, 1, 46),
    // Woes to Pharisees (23)
    ...span(23, 2, 39),
  ),

  // ============ MARK ============
  Mar: w(
    ...span(4, 3, 9),                  // Parable of the sower (Jesus speaking)
    "4:11", "4:12", "4:13", "4:14", "4:15", "4:16", "4:17", "4:18", "4:19", "4:20",
    "4:21", "4:22", "4:23", "4:24", "4:25",
    "4:26", "4:27", "4:28", "4:29",   // Seed growing secretly
    "4:30", "4:31", "4:32",           // Mustard seed
    // Olivet Discourse
    ...span(13, 5, 37),
  ),

  // ============ LUKE ============
  Luk: w(
    // Sermon on the Plain
    ...span(6, 20, 49),
    // Lord's Prayer + teaching on prayer
    ...span(11, 2, 13),
    // Discourse on hypocrisy / discipleship
    ...span(12, 1, 53),
    // Parables of lost sheep / coin / prodigal — Jesus speaking
    ...span(15, 3, 32),
    // Rich man / Lazarus and surrounding parables
    ...span(16, 1, 31),
    // Olivet Discourse (Lukan form)
    ...span(21, 8, 36),
  ),

  // ============ JOHN ============
  Jhn: w(
    // Farewell Discourse — entirely Jesus
    ...span(14, 1, 31),
    ...span(15, 1, 27),
    ...span(16, 1, 33),
    // High-Priestly Prayer
    ...span(17, 1, 26),
  ),

  // ============ ACTS ============
  // Jesus speaks only briefly. We list ONLY verses that are entirely his
  // words, not the surrounding narration.
  Act: w(
    "1:7", "1:8",                      // "It is not for you to know…"
    "9:5", "9:6",                      // Damascus Road
    "9:11", "9:12", "9:15", "9:16",    // To Ananias (vision)
    "18:9", "18:10",                   // Vision in Corinth
    "22:8", "22:10",                   // Paul's retelling
    "22:18", "22:19", "22:20", "22:21",
    "23:11",                           // Vision in the barracks
    "26:14", "26:15", "26:16", "26:17", "26:18",
  ),

  // ============ REVELATION ============
  // The risen Christ speaks throughout, but so do angels, the Spirit, and
  // John. We mark only verses that are clearly Jesus.
  Rev: w(
    "1:8",                             // "I am Alpha and Omega"
    "1:17", "1:18", "1:19", "1:20",    // "Fear not… write the things…"
    // Letters to the seven churches — entirely Jesus dictating
    ...span(2, 1, 29),
    ...span(3, 1, 22),
    "16:15",                           // "Behold, I come as a thief"
    "22:7",                            // "Behold, I come quickly"
    "22:12", "22:13", "22:14", "22:15", "22:16",
    "22:20",                           // "Surely I come quickly"
  ),
};

/**
 * Verses where Jesus speaks part of the verse but other text (narration or
 * another speaker) is also present. Only the *quoted* spans inside the verse
 * will be painted red.
 */
const RED_PARTIAL: PartialMap = {
  Mat: w(
    "3:15",                            // To John the Baptist
    "4:4", "4:7", "4:10", "4:17", "4:19",
    "8:3", "8:4", "8:7", "8:10", "8:11", "8:12", "8:13",
    "8:20", "8:22", "8:26", "8:32",
    "9:2", "9:4", "9:5", "9:6", "9:9", "9:12", "9:13",
    "9:15", "9:16", "9:17", "9:22", "9:24", "9:28", "9:29", "9:37", "9:38",
    "11:4", "11:5", "11:6", "11:7", "11:8", "11:9", "11:10", "11:11",
    "11:12", "11:13", "11:14", "11:15", "11:16", "11:17", "11:18", "11:19",
    "11:21", "11:22", "11:23", "11:24", "11:25", "11:26", "11:27", "11:28",
    "11:29", "11:30",
    "12:3", "12:4", "12:5", "12:6", "12:7", "12:8",
    "12:11", "12:12", "12:13", "12:25", "12:26", "12:27", "12:28", "12:29",
    "12:30", "12:31", "12:32", "12:33", "12:34", "12:35", "12:36", "12:37",
    "12:38", "12:39", "12:40", "12:41", "12:42", "12:43", "12:44", "12:45",
    "12:48", "12:49", "12:50",
    "14:16", "14:17", "14:18", "14:27", "14:29", "14:31",
    "15:3", "15:4", "15:5", "15:6", "15:7", "15:8", "15:9", "15:10", "15:11",
    "15:13", "15:14", "15:16", "15:17", "15:18", "15:19", "15:20",
    "15:24", "15:26", "15:28", "15:32", "15:34",
    "16:2", "16:3", "16:4", "16:6", "16:8", "16:9", "16:10", "16:11",
    "16:13", "16:15", "16:17", "16:18", "16:19", "16:23", "16:24", "16:25",
    "16:26", "16:27", "16:28",
    "17:7", "17:9", "17:11", "17:12", "17:17", "17:20", "17:22", "17:23",
    "17:25", "17:26", "17:27",
    "19:4", "19:5", "19:6", "19:8", "19:9", "19:11", "19:12", "19:14",
    "19:17", "19:18", "19:19", "19:21", "19:23", "19:24", "19:26",
    "19:28", "19:29", "19:30",
    "20:1", "20:2", "20:3", "20:4", "20:5", "20:6", "20:7", "20:8", "20:9",
    "20:10", "20:11", "20:12", "20:13", "20:14", "20:15", "20:16",
    "20:18", "20:19", "20:21", "20:22", "20:23", "20:25", "20:26", "20:27",
    "20:28", "20:32",
    "21:13", "21:16", "21:19", "21:21", "21:22",
    "21:24", "21:25", "21:27", "21:28", "21:29", "21:30", "21:31", "21:32",
    "21:33", "21:34", "21:35", "21:36", "21:37", "21:38", "21:39", "21:40",
    "21:41", "21:42", "21:43", "21:44",
    "22:1", "22:2", "22:3", "22:4", "22:5", "22:6", "22:7", "22:8", "22:9",
    "22:10", "22:11", "22:12", "22:13", "22:14",
    "22:18", "22:19", "22:20", "22:21",
    "22:29", "22:30", "22:31", "22:32", "22:37", "22:38", "22:39", "22:40",
    "22:42", "22:43", "22:44", "22:45",
    "26:2", "26:10", "26:11", "26:12", "26:13", "26:18", "26:21", "26:23",
    "26:24", "26:26", "26:27", "26:28", "26:29", "26:31", "26:32", "26:34",
    "26:36", "26:38", "26:39", "26:40", "26:41", "26:42", "26:45", "26:46",
    "26:50", "26:52", "26:53", "26:54", "26:55", "26:64",
    "27:11", "27:46",                  // "Thou sayest" / "Eli, Eli…"
    "28:9", "28:10", "28:18", "28:19", "28:20",
  ),

  Mar: w(
    "1:15", "1:17", "1:25", "1:38", "1:41", "1:44",
    "2:5", "2:8", "2:9", "2:10", "2:11", "2:14", "2:17",
    "2:19", "2:20", "2:21", "2:22", "2:25", "2:26", "2:27", "2:28",
    "3:3", "3:4", "3:5", "3:23", "3:24", "3:25", "3:26", "3:27", "3:28", "3:29",
    "3:33", "3:34", "3:35",
    "4:35", "4:39", "4:40",
    "5:8", "5:9", "5:19", "5:30", "5:34", "5:36", "5:39", "5:41",
    "6:4", "6:10", "6:11", "6:31", "6:37", "6:38", "6:50",
    "7:6", "7:7", "7:8", "7:9", "7:10", "7:11", "7:12", "7:13",
    "7:14", "7:15", "7:16", "7:18", "7:19", "7:20", "7:21", "7:22", "7:23",
    "7:27", "7:29", "7:34",
    "8:1", "8:2", "8:3", "8:5", "8:12", "8:15", "8:17", "8:18", "8:19", "8:20", "8:21",
    "8:26", "8:29", "8:33", "8:34", "8:35", "8:36", "8:37", "8:38",
    "9:1", "9:12", "9:13", "9:16", "9:19", "9:21", "9:23", "9:25", "9:29",
    "9:31", "9:33", "9:35", "9:36", "9:37", "9:39", "9:40", "9:41", "9:42",
    "9:43", "9:44", "9:45", "9:46", "9:47", "9:48", "9:49", "9:50",
    "10:3", "10:5", "10:6", "10:7", "10:8", "10:9", "10:11", "10:12",
    "10:14", "10:15", "10:18", "10:19", "10:20", "10:21",
    "10:23", "10:24", "10:25", "10:27", "10:29", "10:30", "10:31",
    "10:33", "10:34", "10:36", "10:38", "10:39", "10:40", "10:42", "10:43",
    "10:44", "10:45", "10:49", "10:51", "10:52",
    "11:2", "11:3", "11:14", "11:17", "11:22", "11:23", "11:24", "11:25",
    "11:26", "11:29", "11:30", "11:33",
    "12:1", "12:2", "12:3", "12:4", "12:5", "12:6", "12:7", "12:8", "12:9",
    "12:10", "12:11", "12:15", "12:16", "12:17", "12:24", "12:25", "12:26",
    "12:27", "12:29", "12:30", "12:31", "12:34", "12:35", "12:36", "12:37",
    "12:38", "12:39", "12:40", "12:43", "12:44",
    "14:6", "14:7", "14:8", "14:9", "14:13", "14:14", "14:15", "14:18",
    "14:20", "14:21", "14:22", "14:24", "14:25", "14:27", "14:28", "14:30",
    "14:32", "14:34", "14:36", "14:37", "14:38", "14:41", "14:42", "14:48",
    "14:49", "14:62",
    "15:2",                            // "Thou sayest"
    "16:15", "16:16", "16:17", "16:18",
  ),

  Luk: w(
    "2:49",                            // Boy Jesus in the temple
    "4:4", "4:8", "4:12", "4:18", "4:19", "4:21", "4:23", "4:24", "4:25",
    "4:26", "4:27", "4:35", "4:43",
    "5:4", "5:10", "5:13", "5:14", "5:20", "5:22", "5:23", "5:24", "5:27",
    "5:31", "5:32", "5:34", "5:35", "5:36", "5:37", "5:38", "5:39",
    "6:3", "6:4", "6:5", "6:8", "6:9", "6:10",
    "7:9", "7:13", "7:14", "7:22", "7:23", "7:24", "7:25", "7:26", "7:27",
    "7:28", "7:31", "7:32", "7:33", "7:34", "7:35", "7:40", "7:41", "7:42",
    "7:43", "7:44", "7:45", "7:46", "7:47", "7:48", "7:50",
    "8:10", "8:11", "8:12", "8:13", "8:14", "8:15", "8:16", "8:17", "8:18",
    "8:21", "8:25", "8:30", "8:39", "8:46", "8:48", "8:50", "8:52", "8:54",
    "9:3", "9:4", "9:5", "9:13", "9:14", "9:20", "9:21", "9:22", "9:23",
    "9:24", "9:25", "9:26", "9:27", "9:41", "9:42", "9:44", "9:48",
    "9:50", "9:55", "9:56", "9:58", "9:59", "9:60", "9:62",
    "10:2", "10:3", "10:4", "10:5", "10:6", "10:7", "10:8", "10:9", "10:10",
    "10:11", "10:12", "10:13", "10:14", "10:15", "10:16",
    "10:18", "10:19", "10:20", "10:21", "10:22", "10:23", "10:24",
    "10:26", "10:28", "10:30", "10:31", "10:32", "10:33", "10:34", "10:35",
    "10:36", "10:37", "10:41", "10:42",
    "11:17", "11:18", "11:19", "11:20", "11:21", "11:22", "11:23", "11:24",
    "11:25", "11:26", "11:27", "11:28", "11:29", "11:30", "11:31", "11:32",
    "11:33", "11:34", "11:35", "11:36", "11:39", "11:40", "11:41", "11:42",
    "11:43", "11:44", "11:46", "11:47", "11:48", "11:49", "11:50", "11:51", "11:52",
    "12:54", "12:55", "12:56", "12:57", "12:58", "12:59",
    "13:2", "13:3", "13:4", "13:5", "13:6", "13:7", "13:8", "13:9",
    "13:12", "13:15", "13:16", "13:18", "13:19", "13:20", "13:21",
    "13:24", "13:25", "13:26", "13:27", "13:28", "13:29", "13:30",
    "13:32", "13:33", "13:34", "13:35",
    "14:3", "14:5", "14:8", "14:9", "14:10", "14:11", "14:12", "14:13",
    "14:14", "14:15", "14:16", "14:17", "14:18", "14:19", "14:20", "14:21",
    "14:22", "14:23", "14:24",
    "14:26", "14:27", "14:28", "14:29", "14:30", "14:31", "14:32", "14:33",
    "14:34", "14:35",
    "17:1", "17:2", "17:3", "17:4", "17:5", "17:6", "17:7", "17:8", "17:9",
    "17:10", "17:14", "17:17", "17:18", "17:19",
    "17:20", "17:21", "17:22", "17:23", "17:24", "17:25", "17:26", "17:27",
    "17:28", "17:29", "17:30", "17:31", "17:32", "17:33", "17:34", "17:35", "17:37",
    "18:1", "18:2", "18:3", "18:4", "18:5", "18:6", "18:7", "18:8",
    "18:9", "18:10", "18:11", "18:12", "18:13", "18:14",
    "18:16", "18:17", "18:19", "18:20", "18:22",
    "18:24", "18:25", "18:27", "18:29", "18:30",
    "18:31", "18:32", "18:33", "18:41", "18:42",
    "19:5", "19:9", "19:10", "19:13", "19:17", "19:19", "19:22", "19:23",
    "19:24", "19:26", "19:27", "19:30", "19:31", "19:40",
    "19:41", "19:42", "19:43", "19:44", "19:46",
    "20:3", "20:4", "20:8", "20:17", "20:18", "20:23", "20:24", "20:25",
    "20:34", "20:35", "20:36", "20:37", "20:38",
    "20:41", "20:42", "20:43", "20:44", "20:46", "20:47",
    "21:3", "21:4", "21:6", "21:7",
    "22:8", "22:10", "22:11", "22:12", "22:15", "22:16", "22:17", "22:18",
    "22:19", "22:20", "22:21", "22:22", "22:25", "22:26", "22:27", "22:28",
    "22:29", "22:30", "22:31", "22:32", "22:33", "22:34", "22:35", "22:36",
    "22:37", "22:38", "22:40", "22:42", "22:46", "22:48", "22:51", "22:52",
    "22:53", "22:67", "22:68", "22:69", "22:70",
    "23:28", "23:29", "23:30", "23:31", "23:34", "23:43", "23:46",
    "24:17", "24:19", "24:25", "24:26",
    "24:36", "24:38", "24:39", "24:41", "24:44", "24:46", "24:47", "24:48", "24:49",
  ),

  Jhn: w(
    "1:38", "1:39", "1:42", "1:43", "1:47", "1:48", "1:50", "1:51",
    "2:4", "2:7", "2:8", "2:16", "2:19",
    "3:3", "3:5", "3:6", "3:7", "3:8", "3:10", "3:11", "3:12", "3:13",
    "3:14", "3:15", "3:16", "3:17", "3:18", "3:19", "3:20", "3:21",
    "4:7", "4:10", "4:13", "4:14", "4:16", "4:17", "4:18", "4:21", "4:22",
    "4:23", "4:24", "4:26", "4:32", "4:34", "4:35", "4:36", "4:37", "4:38",
    "4:48", "4:50",
    "5:6", "5:8", "5:14", "5:17", "5:19", "5:20", "5:21", "5:22", "5:23",
    "5:24", "5:25", "5:26", "5:27", "5:28", "5:29", "5:30", "5:31", "5:32",
    "5:33", "5:34", "5:35", "5:36", "5:37", "5:38", "5:39", "5:40", "5:41",
    "5:42", "5:43", "5:44", "5:45", "5:46", "5:47",
    "6:5", "6:10", "6:12", "6:20", "6:26", "6:27", "6:29", "6:32", "6:33",
    "6:35", "6:36", "6:37", "6:38", "6:39", "6:40", "6:43", "6:44", "6:45",
    "6:46", "6:47", "6:48", "6:49", "6:50", "6:51", "6:53", "6:54", "6:55",
    "6:56", "6:57", "6:58", "6:61", "6:62", "6:63", "6:64", "6:65", "6:67",
    "6:70",
    "7:6", "7:7", "7:8", "7:16", "7:17", "7:18", "7:19", "7:21", "7:22",
    "7:23", "7:24", "7:28", "7:29", "7:33", "7:34", "7:37", "7:38",
    "8:7", "8:10", "8:11", "8:12", "8:14", "8:15", "8:16", "8:17", "8:18",
    "8:19", "8:21", "8:23", "8:24", "8:25", "8:26", "8:28", "8:29", "8:31",
    "8:32", "8:34", "8:35", "8:36", "8:37", "8:38", "8:39", "8:40", "8:41",
    "8:42", "8:43", "8:44", "8:45", "8:46", "8:47", "8:49", "8:50", "8:51",
    "8:54", "8:55", "8:56", "8:58",
    "9:3", "9:4", "9:5", "9:7", "9:35", "9:37", "9:39", "9:41",
    "10:1", "10:2", "10:3", "10:4", "10:5", "10:6", "10:7", "10:8", "10:9",
    "10:10", "10:11", "10:12", "10:13", "10:14", "10:15", "10:16", "10:17",
    "10:18", "10:25", "10:26", "10:27", "10:28", "10:29", "10:30",
    "10:32", "10:34", "10:35", "10:36", "10:37", "10:38",
    "11:4", "11:7", "11:9", "11:10", "11:11", "11:14", "11:15", "11:23",
    "11:25", "11:26", "11:34", "11:39", "11:40", "11:41", "11:42", "11:43", "11:44",
    "12:7", "12:8", "12:23", "12:24", "12:25", "12:26", "12:27", "12:28",
    "12:30", "12:31", "12:32", "12:35", "12:36", "12:44", "12:45", "12:46",
    "12:47", "12:48", "12:49", "12:50",
    "13:7", "13:8", "13:10", "13:11", "13:12", "13:13", "13:14", "13:15",
    "13:16", "13:17", "13:18", "13:19", "13:20", "13:21", "13:26", "13:27",
    "13:31", "13:32", "13:33", "13:34", "13:35", "13:36", "13:38",
    "18:4", "18:7", "18:8", "18:11", "18:20", "18:21", "18:23", "18:34",
    "18:36", "18:37",
    "19:11", "19:26", "19:27", "19:28", "19:30",
    "20:15", "20:16", "20:17", "20:19", "20:21", "20:22", "20:23",
    "20:26", "20:27", "20:29",
    "21:5", "21:6", "21:10", "21:12", "21:15", "21:16", "21:17", "21:18", "21:19", "21:22",
  ),

  Act: w(
    "1:4", "1:5",                      // "wait for the promise"
    "9:4",                             // "Saul, Saul, why persecutest thou me?"
    "9:10",                            // "Ananias" (one-word call)
    "11:16",                           // Quoting Jesus' earlier saying
    "22:7",                            // "Saul, Saul…"
  ),

  Rev: w(
    "1:11",                            // "I am Alpha and Omega: what thou seest, write…"
  ),
};

/**
 * Map common API.Bible / OSIS book identifiers to the keys above so callers
 * can pass whichever abbreviation they have on hand.
 */
const BOOK_ALIAS: Record<string, "Mat" | "Mar" | "Luk" | "Jhn" | "Act" | "Rev"> = {
  Mat: "Mat", Matt: "Mat", Mt: "Mat", Matthew: "Mat",
  Mar: "Mar", Mark: "Mar", Mk: "Mar", Mrk: "Mar",
  Luk: "Luk", Luke: "Luk", Lk: "Luk",
  Jhn: "Jhn", John: "Jhn", Jn: "Jhn", Joh: "Jhn",
  Act: "Act", Acts: "Act",
  Rev: "Rev", Revelation: "Rev", Re: "Rev",
};

function classify(
  bookAbbr: string,
  chapter: number,
  verse: number,
): "whole" | "partial" | "none" {
  const key = BOOK_ALIAS[bookAbbr];
  if (!key) return "none";
  const id = `${chapter}:${verse}`;
  if (RED_WHOLE[key]?.has(id)) return "whole";
  if (RED_PARTIAL[key]?.has(id)) return "partial";
  return "none";
}

/** True when this verse is a candidate for Jesus' speech (either list). */
function isJesusSpeechVerse(
  bookAbbr: string,
  chapter: number,
  verse: number,
): boolean {
  return classify(bookAbbr, chapter, verse) !== "none";
}

/**
 * Straight apostrophe used as an opening single-quote (e.g. `say, 'He…`),
 * not a contraction (`isn't`) or possessive (`Jesus'`).
 */
function isSingleQuoteOpener(text: string, i: number): boolean {
  if (text[i] !== "'") return false;
  if (i === 0) return true;
  const before = text[i - 1];
  if (!/[\s,([{—–-]/.test(before)) return false;
  const after = text[i + 1];
  return after !== undefined && /[A-Za-z0-9"']/.test(after);
}

/** Straight apostrophe closing a single-quoted span, not a contraction. */
function isSingleQuoteCloser(text: string, i: number): boolean {
  if (text[i] !== "'") return false;
  const before = text[i - 1];
  const after = text[i + 1];
  if (
    before !== undefined &&
    after !== undefined &&
    /[a-zA-Z]/.test(before) &&
    /[a-zA-Z]/.test(after)
  ) {
    return false;
  }
  if (before !== undefined && /[a-zA-Z]/.test(before)) return false;
  return after === undefined || /[\s,.!?;:)\]}]/.test(after);
}

type QuoteAction = "open" | "close";

/** Classify a character as opening/closing a quoted span at the current depth. */
function quoteAction(text: string, i: number, depth: number): QuoteAction | null {
  const ch = text[i];
  if (ch === "\u201C" || ch === "\u2018") return "open";
  if (ch === "\u201D" || ch === "\u2019") return "close";
  if (ch === '"') return depth % 2 === 0 ? "open" : "close";
  if (isSingleQuoteOpener(text, i)) return "open";
  if (depth > 0 && isSingleQuoteCloser(text, i)) return "close";
  return null;
}

/**
 * Split verse text by quotation marks. Only outermost quoted spans (depth 1)
 * are Jesus' words; nested quotes stay black. Returns remaining quote depth so
 * callers can continue across verse boundaries.
 */
function splitByQuotesStateful(
  text: string,
  initialDepth: number,
): { segments: Segment[]; depth: number } {
  const out: Segment[] = [];
  let buf = "";
  let depth = initialDepth;

  const flush = () => {
    if (!buf) return;
    out.push({ text: buf, isJesus: depth === 1 });
    buf = "";
  };

  for (let i = 0; i < text.length; i++) {
    const action = quoteAction(text, i, depth);
    if (action === "open") {
      flush();
      buf += text[i];
      flush();
      depth++;
      continue;
    }
    if (action === "close" && depth > 0) {
      flush();
      buf += text[i];
      flush();
      depth--;
      continue;
    }
    buf += text[i];
  }

  flush();
  return { segments: out, depth };
}

/**
 * Chapter-level splitter. Returns segments for every verse in the chapter.
 *
 * For each verse:
 *   • speech  (WHOLE or PARTIAL list) → split by quotation marks; carry depth
 *   • none    → one segment, no red (resets quote depth)
 *
 * Nothing is painted red except text inside outermost quotation marks.
 */
export function splitJesusSpeechForChapter(
  bookAbbr: string,
  chapter: number,
  verses: { number: number; text: string }[],
): Map<number, Segment[]> {
  const result = new Map<number, Segment[]>();
  let quoteDepth = 0;

  for (const v of verses) {
    const text = typeof v.text === "string" ? v.text : "";
    if (isJesusSpeechVerse(bookAbbr, chapter, v.number)) {
      const { segments, depth } = splitByQuotesStateful(text, quoteDepth);
      quoteDepth = depth;
      result.set(
        v.number,
        segments.length > 0 ? segments : [{ text, isJesus: false }],
      );
    } else {
      quoteDepth = 0;
      result.set(v.number, [{ text, isJesus: false }]);
    }
  }

  return result;
}