/** Minimal cross-ref parser for edge function (mirrors client parseBibleReference). */
function parseBibleReference(input: string): { bookAbbr: string; chapter: number; verse?: number } | null {
  const q = input.trim().replace(/\s+/g, " ");
  const m = /^((?:\d\s*)?[A-Za-z.]+(?:\s+[A-Za-z.]+)?)\s+(\d+)(?:\s*:\s*(\d+))?(?:\s*[-–—]\s*\d+)?$/i.exec(q);
  if (!m) return null;
  const bookPart = m[1]!.replace(/\./g, "").trim();
  const chapter = parseInt(m[2]!, 10);
  const verse = m[3] ? parseInt(m[3], 10) : undefined;
  if (!Number.isFinite(chapter) || chapter < 1) return null;
  const aliases: Record<string, string> = {
    jn: "Jhn", john: "Jhn", matt: "Mat", mt: "Mat", mk: "Mrk", mark: "Mrk",
    lk: "Luk", luke: "Luk", gen: "Gen", ps: "Psa", psa: "Psa", rom: "Rom", rev: "Rev",
  };
  const alias = aliases[bookPart.toLowerCase()];
  if (alias) return { bookAbbr: alias, chapter, verse };
  return null;
}

type VersePartStyle = "divine" | "inscription";
type VersePart =
  | { kind: "text"; text: string; style?: VersePartStyle }
  | { kind: "footnote"; marker: number; text: string }
  | { kind: "crossref"; label: string; book: string; chapter: number; verse: number; letter?: string };

function versePlainText(v: { parts?: VersePart[]; text: string }): string {
  if (v.parts?.length) {
    return v.parts.filter((p): p is Extract<VersePart, { kind: "text" }> => p.kind === "text").map((p) => p.text).join("");
  }
  return v.text;
}

function collectCrossRefs(parts: VersePart[]) {
  return parts.filter((p): p is Extract<VersePart, { kind: "crossref" }> => p.kind === "crossref")
    .map(({ label, book, chapter, verse }) => ({ label, book, chapter, verse }));
}

function collectFootnotes(parts: VersePart[]) {
  return parts.filter((p): p is Extract<VersePart, { kind: "footnote" }> => p.kind === "footnote")
    .map(({ marker, text }) => ({ marker, text }));
}

function assignCrossRefLetters(parts: VersePart[]): VersePart[] {
  let index = 0;
  return parts.map((part) => {
    if (part.kind !== "crossref") return part;
    if (part.letter) return part;
    const letter = index < 26 ? String.fromCharCode(97 + index) : `${String.fromCharCode(97 + (index % 26))}${Math.floor(index / 26)}`;
    index += 1;
    return { ...part, letter };
  });
}

function mergeVerseEntries(existing: PassageVerse, incoming: PassageVerse): PassageVerse {
  const parts = [...(existing.parts ?? [{ kind: "text" as const, text: existing.text }]), ...(incoming.parts ?? [{ kind: "text" as const, text: incoming.text }])];
  const text = sanitizePubVerseText(versePlainText({ text: "", parts }));
  return { number: existing.number, text, parts, crossRefs: collectCrossRefs(parts), footnotes: collectFootnotes(parts) };
}

function poetryLevelFromClass(cls: string): number {
  if (/\bq3\b/.test(cls)) return 3;
  if (/\bq2\b/.test(cls)) return 2;
  if (/\bq1\b/.test(cls) || /\bq\b/.test(cls)) return 1;
  return 0;
}

export interface PassageVerse {
  number: number;
  text: string;
  parts?: VersePart[];
  crossRefs?: { label: string; book: string; chapter: number; verse: number }[];
  footnotes?: { marker: number; text: string }[];
}

export interface PassageHeading {
  /** First verse that follows this heading in reading order. */
  beforeVerse: number;
  text: string;
}

export interface PoetryBlock {
  beforeVerse: number;
  level: number;
}

export interface ParsedPassage {
  reference: string;
  verses: PassageVerse[];
  /** Verse numbers that begin a new indented paragraph. Always includes 1 when present. */
  paragraphStarts: number[];
  headings: PassageHeading[];
  poetryBlocks: PoetryBlock[];
}

const VERSE_MARKER =
  /<(?:span|sup)\b[^>]*\bclass=["'][^"']*\bv\b[^"']*["'][^>]*>\s*(\d+)\s*<\/(?:span|sup)>/gi;

const PARAGRAPH_CLASS = /\bclass=["']([^"']+)["']/i;

/** Text paragraph classes from API.Bible scripture markup. */
const TEXT_PARAGRAPH_RE = /\b(p|m|pm|pmo|pmc|li\d?|q\d?)\b/;

/** Section heading classes from API.Bible scripture markup. */
const HEADING_CLASS_RE = /\b(s\d?|ms\d?|d)\b/;

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&#8212;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&#8211;/g, "\u2013");
}

/** Any dash-like character used in API.Bible `#-#` bridge markers. */
const PUB_DASH = /[-—–‐‑‒–—]/;

/**
 * Join API.Bible small-cap span splits. Inscriptions use short tails (THIS, KING);
 * the pronoun "I" must stay separate from the next word.
 */
function joinSmallCapSpan(first: string, rest: string): string {
  if (!rest) return first;
  if (first === "I") {
    if (rest.length === 1) return (first + rest).toUpperCase();
    return `${first} ${rest}`;
  }
  if (rest.length <= 3) return (first + rest).toUpperCase();
  return first + rest;
}

/** Fix pronoun I merged with a following word from older parsers (IDIDN'T → I didn't). */
function repairGluedPronounI(text: string): string {
  return text.replace(/\bI([A-Z][A-Za-z']+)/g, (_m, tail: string) => `I ${tail.toLowerCase()}`);
}

/**
 * Repair verse text when inline HTML tags were replaced with spaces (e.g. CSB
 * small-cap spans `<span class="sc">T</span>his` → "T his").
 */
function repairSplitInitialCaps(text: string): string {
  const splits = text.match(/\b[A-Z] [a-z]+\b/g);
  if (!splits || splits.length < 2) return text;
  return text.replace(/\b([A-Z]) ([a-z]+)\b/g, (_m, cap: string, rest: string) => {
    if (cap === "I" && rest.length === 1) return (cap + rest).toUpperCase();
    if (cap === "I") return `I ${rest}`;
    return (cap + rest).toUpperCase();
  });
}

/**
 * Remove API.Bible publisher debris from verse text (`#-#`, `#— #`, lone `#` anchors).
 * Exported so cached passages are cleaned on every load, not only at parse time.
 */
export function sanitizePubVerseText(text: string, options?: { trim?: boolean }): string {
  const trim = options?.trim !== false;
  let t = repairGluedPronounI(text);
  t = repairSplitInitialCaps(t);
  t = t.replace(new RegExp(`#\\s*${PUB_DASH.source}\\s*#`, "g"), "\u2014");
  t = t.replace(/#\s*#/g, "\u2014");
  t = t.replace(/\s+#\s+(?=[A-Za-z0-9"([])/g, " ");
  t = t.replace(/([,.;:]|\u2014)\s*#\s+(?=[A-Za-z0-9])/g, "$1 ");
  t = t.replace(/\^+/g, "");
  t = t.replace(/,\s*,+/g, ",");
  t = t.replace(/([,.;:])([A-Za-z])/g, "$1 $2");
  t = t.replace(/\.\s*,+\s*$/g, ".");
  t = t.replace(/\s+/g, " ");
  if (trim) t = t.trim();
  t = t.replace(/\s+([,.!?;:])/g, "$1");
  return t;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|div|li|tr|td|th|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "");
}

function notePlainText(noteHtml: string): string {
  const inner = noteHtml.replace(/^<note\b[^>]*>/i, "").replace(/<\/note>$/i, "");
  return sanitizePubVerseText(decodeEntities(stripHtmlTags(inner)));
}

/** API.Bible USFM ids on citation spans (e.g. MAT.12.41). */
const USFM_TO_BOOK_ABBR: Record<string, string> = {
  GEN: "Gen", EXO: "Exo", LEV: "Lev", NUM: "Num", DEU: "Deu", JOS: "Jos", JDG: "Jdg", RUT: "Rut",
  "1SA": "1Sa", "2SA": "2Sa", "1KI": "1Ki", "2KI": "2Ki", "1CH": "1Ch", "2CH": "2Ch",
  EZR: "Ezr", NEH: "Neh", EST: "Est", JOB: "Job", PSA: "Psa", PRO: "Pro", ECC: "Ecc", SNG: "Sng",
  ISA: "Isa", JER: "Jer", LAM: "Lam", EZK: "Ezk", DAN: "Dan", HOS: "Hos", JOL: "Jol", AMO: "Amo",
  OBA: "Oba", JON: "Jon", MIC: "Mic", NAM: "Nam", HAB: "Hab", ZEP: "Zep", HAG: "Hag", ZEC: "Zec",
  MAL: "Mal", MAT: "Mat", MRK: "Mrk", LUK: "Luk", JHN: "Jhn", ACT: "Act", ROM: "Rom", "1CO": "1Co",
  "2CO": "2Co", GAL: "Gal", EPH: "Eph", PHP: "Php", COL: "Col", "1TH": "1Th", "2TH": "2Th",
  "1TI": "1Ti", "2TI": "2Ti", TIT: "Tit", PHM: "Phm", HEB: "Heb", JAS: "Jas", "1PE": "1Pe",
  "2PE": "2Pe", "1JN": "1Jn", "2JN": "2Jn", "3JN": "3Jn", JUD: "Jud", REV: "Rev",
};

function parseUsfmSpanId(id: string): { bookAbbr: string; chapter: number; verse: number } | null {
  const m = /^([A-Z0-9]+)\.(\d+)\.(\d+)/i.exec(id.trim());
  if (!m) return null;
  const bookAbbr = USFM_TO_BOOK_ABBR[m[1]!.toUpperCase()];
  const chapter = parseInt(m[2]!, 10);
  const verse = parseInt(m[3]!, 10);
  if (!bookAbbr || !Number.isFinite(chapter) || !Number.isFinite(verse)) return null;
  return { bookAbbr, chapter, verse };
}

function crossRefPartFromCitation(id: string | undefined, labelRaw: string): Extract<VersePart, { kind: "crossref" }> | null {
  const label = decodeEntities(stripHtmlTags(labelRaw)).replace(/^[\s—–-]+/, "").trim();
  if (!label || /^[—–-]+$/.test(label)) return null;
  let parsed = id ? parseUsfmSpanId(id) : null;
  if (!parsed?.verse) {
    parsed = parseBibleReference(label) ?? parsed;
  }
  if (!parsed?.verse) return null;
  return {
    kind: "crossref",
    label,
    book: parsed.bookAbbr,
    chapter: parsed.chapter,
    verse: parsed.verse,
  };
}

function pushXtCrossRefs(xtInner: string, parts: VersePart[], pushText: (raw: string) => void): void {
  const spans = [...xtInner.matchAll(/<span\b[^>]*\bid=["']([^"']+)["'][^>]*>([\s\S]*?)<\/span>/gi)];
  if (spans.length > 0) {
    for (const [, id, inner] of spans) {
      const part = crossRefPartFromCitation(id, inner);
      if (part) parts.push(part);
      else {
        const fallback = decodeEntities(stripHtmlTags(inner)).trim();
        if (fallback) pushText(fallback);
      }
    }
    return;
  }
  const plain = decodeEntities(stripHtmlTags(xtInner));
  for (const chunk of plain.split(/;\s*/)) {
    const part = crossRefPartFromCitation(undefined, chunk);
    if (part) parts.push(part);
    else {
      const fallback = chunk.trim();
      if (fallback) pushText(fallback);
    }
  }
}

function extractStudyFootnoteBlocks(html: string): { html: string; blocks: string[] } {
  const blocks: string[] = [];
  let out = "";
  let i = 0;
  const openRe = /<span\b[^>]*\bclass=["'](?:[^"']*\s)?f(?:\s+[^"']*)?["'][^>]*>/gi;
  while (i < html.length) {
    openRe.lastIndex = i;
    const m = openRe.exec(html);
    if (!m) {
      out += html.slice(i);
      break;
    }
    const start = m.index;
    out += html.slice(i, start);
    let depth = 1;
    let pos = start + m[0].length;
    while (pos < html.length && depth > 0) {
      const nextOpen = html.indexOf("<span", pos);
      const nextClose = html.indexOf("</span>", pos);
      if (nextClose === -1) {
        pos = html.length;
        break;
      }
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        pos = nextOpen + 5;
      } else {
        depth -= 1;
        pos = nextClose + 7;
      }
    }
    blocks.push(html.slice(start, pos));
    out += `\uE000STUDYFN${blocks.length - 1}\uE001`;
    i = pos;
  }
  return { html: out, blocks };
}

function innerHtmlOfNestedSpan(token: string, className: string): string | null {
  const openRe = new RegExp(`<span\\b[^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, "i");
  const m = openRe.exec(token);
  if (!m) return null;
  let depth = 1;
  let pos = m.index + m[0].length;
  const contentStart = pos;
  while (pos < token.length && depth > 0) {
    const nextOpen = token.indexOf("<span", pos);
    const nextClose = token.indexOf("</span>", pos);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + 5;
    } else {
      depth -= 1;
      pos = nextClose + 7;
    }
  }
  return token.slice(contentStart, pos - 7);
}

function parseStudyFootnoteSpan(token: string, parts: VersePart[], footnoteIdx: number): number {
  const xtInner = innerHtmlOfNestedSpan(token, "xt");
  if (xtInner) {
    pushXtCrossRefs(xtInner, parts, (raw) => appendTextPart(parts, sanitizePubVerseText(decodeEntities(stripHtmlTags(raw)), { trim: false })));
    return footnoteIdx;
  }
  let text = "";
  const ftMatch =
    /<span\b[^>]*\bclass=["'][^"']*\bft\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(token);
  if (ftMatch) text += decodeEntities(stripHtmlTags(ftMatch[1]!));
  for (const m of token.matchAll(/<span\b[^>]*\bclass=["'][^"']*\bfqa\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)) {
    text += decodeEntities(stripHtmlTags(m[1]!));
  }
  for (const m of token.matchAll(/<span\b[^>]*\bclass=["'][^"']*\bfq\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)) {
    text += ` ${decodeEntities(stripHtmlTags(m[1]!))}`;
  }
  const cleaned = sanitizePubVerseText(text, { trim: true });
  if (!cleaned) return footnoteIdx;
  footnoteIdx += 1;
  parts.push({ kind: "footnote", marker: footnoteIdx, text: cleaned });
  return footnoteIdx;
}

function appendTextPart(parts: VersePart[], text: string, style?: VersePartStyle): void {
  if (!text) return;
  const last = parts[parts.length - 1];
  if (last?.kind === "text" && !style && !last.style) {
    last.text += text;
    return;
  }
  parts.push({ kind: "text", text, style });
}

/** Parse inline API.Bible markup into ordered verse parts (text, footnotes, cross-refs). */
export function parseVerseHtmlToParts(html: string, footnoteStart = 0): {
  parts: VersePart[];
  nextFootnoteMarker: number;
} {
  const parts: VersePart[] = [];
  let footnoteIdx = footnoteStart;
  let work = html.replace(/<br\s*\/?>/gi, " ");
  const studyExtract = extractStudyFootnoteBlocks(work);
  work = studyExtract.html;
  const studyBlocks = studyExtract.blocks;

  const pushText = (raw: string, style?: VersePartStyle) => {
    const text = sanitizePubVerseText(decodeEntities(stripHtmlTags(raw)), { trim: false });
    appendTextPart(parts, text, style);
  };

  const tokenRe =
    /\uE000STUDYFN\d+\uE001|<note\b[\s\S]*?<\/note>|<span\b[^>]*\bclass=["'][^"']*\bxo[^"']*["'][^>]*>\s*[a-z]\s*<\/span>\s*<span\b[^>]*\bclass=["'][^"']*\bxt\b[^"']*["'][^>]*>[\s\S]*?<\/span>|<span\b[^>]*\bclass=["'][^"']*\bxt\b[^"']*["'][^>]*>[\s\S]*?<\/span>(?:\s*<span\b[^>]*\bclass=["'][^"']*\bxo[^"']*["'][^>]*>\s*#\s*<\/span>)?|<span\b[^>]*\bclass=["'][^"']*\bxo[^"']*["'][^>]*>\s*#\s*<\/span>\s*<span\b[^>]*\bclass=["'][^"']*\bxt\b[^"']*["'][^>]*>[\s\S]*?<\/span>\s*<span\b[^>]*\bclass=["'][^"']*\bxo[^"']*["'][^>]*>\s*#\s*<\/span>|<span\b[^>]*\bclass=["'][^"']*\bnd\b[^"']*["'][^>]*>[\s\S]*?<\/span>|<span\b[^>]*\bclass=["'][^"']*\bsc\b[^"']*["'][^>]*>([A-Za-z])<\/span>([a-z]*)/gi;

  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(work)) !== null) {
    if (m.index > lastIndex) {
      pushText(work.slice(lastIndex, m.index));
    }
    const token = m[0];
    if (/^\uE000STUDYFN/i.test(token)) {
      const idx = Number(token.slice("\uE000STUDYFN".length, -"\uE001".length));
      const block = studyBlocks[idx];
      if (block) footnoteIdx = parseStudyFootnoteSpan(block, parts, footnoteIdx);
    } else if (/^<note/i.test(token)) {
      footnoteIdx += 1;
      const text = notePlainText(token);
      if (text) parts.push({ kind: "footnote", marker: footnoteIdx, text });
    } else if (/\bxt\b/i.test(token)) {
      const xoLetterMatch =
        /<span\b[^>]*\bclass=["'][^"']*\bxo[^"']*["'][^>]*>\s*([a-z])\s*<\/span>/i.exec(token);
      const letter = xoLetterMatch?.[1];
      const labelMatch = /<span\b[^>]*\bclass=["'][^"']*\bxt\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(token);
      const label = decodeEntities((labelMatch?.[1] ?? "").replace(/^[\s—–-]+/, "").trim());
      if (!label || /^[—–-]+$/.test(label)) {
        pushText("\u2014");
      } else {
        const parsed = parseBibleReference(label);
        if (parsed?.verse) {
          parts.push({
            kind: "crossref",
            label,
            book: parsed.bookAbbr,
            chapter: parsed.chapter,
            verse: parsed.verse,
            ...(letter ? { letter } : {}),
          });
        } else {
          pushText(label);
        }
      }
    } else if (/\bnd\b/i.test(token)) {
      const innerMatch = /<span\b[^>]*>([\s\S]*?)<\/span>/i.exec(token);
      pushText(innerMatch?.[1] ?? "", "divine");
    } else if (/\bsc\b/i.test(token)) {
      pushText(joinSmallCapSpan(m[1] ?? "", m[2] ?? ""), "inscription");
    }
    lastIndex = m.index + token.length;
  }

  if (lastIndex < work.length) {
    pushText(work.slice(lastIndex));
  }

  work = work.replace(
    /<span\b[^>]*\bclass=["'](?:[^"']*\s)?f(?:\s+[^"']*)?["'][^>]*>[\s\S]*?<\/span>/gi,
    "",
  );
  work = work.replace(
    /<(?:span|a|sup|div)\b[^>]*\bclass=["'][^"']*\b(?:note|ft|fr|fk|fqa|fq|xo|xop|xot|xnt|notelink|footnote|crossref|x)\b[^"']*["'][^>]*>[\s\S]*?<\/(?:span|a|sup|div)>/gi,
    "",
  );
  work = work.replace(new RegExp(`#\\s*${PUB_DASH.source}\\s*#`, "g"), "\u2014");
  work = work.replace(/<span\b[^>]*>\s*#\s*<\/span>/gi, "");

  if (parts.length === 0) {
    pushText(work);
  }

  return { parts, nextFootnoteMarker: footnoteIdx };
}

function cleanHeadingText(raw: string): string {
  return sanitizePubVerseText(decodeEntities(stripHtmlTags(raw)));
}

function buildPassageVerse(number: number, parts: VersePart[]): PassageVerse | null {
  const normalizedParts = assignCrossRefLetters(parts);
  const text = sanitizePubVerseText(versePlainText({ number, text: "", parts: normalizedParts }));
  if (!text && normalizedParts.every((p) => p.kind !== "footnote" && p.kind !== "crossref")) {
    return null;
  }
  return {
    number,
    text,
    parts: normalizedParts,
    crossRefs: collectCrossRefs(normalizedParts),
    footnotes: collectFootnotes(normalizedParts),
  };
}

function extractVersesFromBlock(html: string): PassageVerse[] {
  const markers: { index: number; num: number; length: number }[] = [];
  const re = new RegExp(VERSE_MARKER.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    markers.push({ index: m.index, num: parseInt(m[1], 10), length: m[0].length });
  }
  if (markers.length === 0) return [];

  const verses: PassageVerse[] = [];
  let footnoteMarker = 0;
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : html.length;
    const slice = html.slice(start, end);
    const { parts, nextFootnoteMarker } = parseVerseHtmlToParts(slice, footnoteMarker);
    footnoteMarker = nextFootnoteMarker;
    const verse = buildPassageVerse(markers[i].num, parts);
    if (verse) verses.push(verse);
  }
  return verses;
}

function splitParagraphBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re = /<p\b[^>]*>[\s\S]*?<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) blocks.push(m[0]);
  return blocks;
}

function paragraphClass(block: string): string {
  return PARAGRAPH_CLASS.exec(block)?.[1] ?? "";
}

function isHeadingBlock(block: string): boolean {
  if (extractVersesFromBlock(block).length > 0) return false;
  const cls = paragraphClass(block);
  return HEADING_CLASS_RE.test(cls);
}

function isTextBlock(block: string): boolean {
  const cls = paragraphClass(block);
  if (!cls) return extractVersesFromBlock(block).length > 0;
  if (isHeadingBlock(block)) return false;
  return TEXT_PARAGRAPH_RE.test(cls) || extractVersesFromBlock(block).length > 0;
}

/** Parse API.Bible HTML chapter content into verses, paragraph breaks, and headings. */
export function parsePassageHtml(content: string, reference = ""): ParsedPassage {
  const blocks = splitParagraphBlocks(content);
  const verseMap = new Map<number, PassageVerse>();
  const paragraphStarts: number[] = [];
  const poetryBlocks: PoetryBlock[] = [];
  const headings: PassageHeading[] = [];
  let nextHeading: string | null = null;

  for (const block of blocks) {
    if (isHeadingBlock(block)) {
      const text = cleanHeadingText(block.replace(/^<p\b[^>]*>/i, "").replace(/<\/p>$/i, ""));
      if (text) nextHeading = text;
      continue;
    }
    if (!isTextBlock(block)) continue;

    const cls = paragraphClass(block);
    const inner = block.replace(/^<p\b[^>]*>/i, "").replace(/<\/p>$/i, "");
    const blockVerses = extractVersesFromBlock(inner);
    if (blockVerses.length === 0) continue;

    const firstVerse = blockVerses[0]!.number;
    paragraphStarts.push(firstVerse);
    const poetryLevel = poetryLevelFromClass(cls);
    if (poetryLevel > 0) {
      poetryBlocks.push({ beforeVerse: firstVerse, level: poetryLevel });
    }
    if (nextHeading) {
      headings.push({ beforeVerse: firstVerse, text: nextHeading });
      nextHeading = null;
    }
    for (const v of blockVerses) {
      const existing = verseMap.get(v.number);
      verseMap.set(v.number, existing ? mergeVerseEntries(existing, v) : v);
    }
  }

  const verses = [...verseMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);

  if (verses.length > 0 && paragraphStarts.length === 0) {
    paragraphStarts.push(verses[0]!.number);
  }

  return {
    reference,
    verses,
    paragraphStarts,
    headings,
    poetryBlocks,
  };
}

/** Plain-text fallback when HTML has no paragraph markup. */
export function parseChapterText(content: string): PassageVerse[] {
  const verses: PassageVerse[] = [];
  const re = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const num = parseInt(m[1], 10);
    const text = sanitizePubVerseText(m[2].replace(/\s+/g, " ").trim());
    if (text) verses.push({ number: num, text, parts: [{ kind: "text", text }] });
  }
  return verses;
}

export function poetryLevelForVerse(
  poetryBlocks: ReadonlyArray<PoetryBlock>,
  verseNumber: number,
): number {
  let level = 0;
  for (const block of poetryBlocks) {
    if (block.beforeVerse <= verseNumber) level = block.level;
    else break;
  }
  return level;
}

export function groupVersesIntoParagraphs(
  slice: PassageVerse[],
  paragraphStarts: ReadonlySet<number>,
): { verses: PassageVerse[]; isContinuation: boolean }[] {
  if (slice.length === 0) return [];

  const groups: { verses: PassageVerse[]; isContinuation: boolean }[] = [];
  let current: PassageVerse[] = [];

  for (const v of slice) {
    if (current.length > 0 && paragraphStarts.has(v.number)) {
      groups.push({
        verses: current,
        isContinuation: groups.length === 0 && !paragraphStarts.has(current[0]!.number),
      });
      current = [];
    }
    current.push(v);
  }

  if (current.length > 0) {
    groups.push({
      verses: current,
      isContinuation: groups.length === 0 && !paragraphStarts.has(current[0]!.number),
    });
  }

  return groups;
}
