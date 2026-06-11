import { parseBibleReference } from "@/lib/bible/parseBibleReference";

export interface PassageVerse {
  number: number;
  text: string;
  crossRefs?: { label: string; book: string; chapter: number; verse: number }[];
  footnotes?: { marker: number; text: string }[];
}

export interface PassageHeading {
  /** First verse that follows this heading in reading order. */
  beforeVerse: number;
  text: string;
}

export interface ParsedPassage {
  reference: string;
  verses: PassageVerse[];
  /** Verse numbers that begin a new indented paragraph. Always includes 1 when present. */
  paragraphStarts: number[];
  headings: PassageHeading[];
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
 * Repair verse text when inline HTML tags were replaced with spaces (e.g. CSB
 * small-cap spans `<span class="sc">T</span>his` → "T his").
 */
function repairSplitInitialCaps(text: string): string {
  const splits = text.match(/\b[A-Z] [a-z]+\b/g);
  if (!splits || splits.length < 2) return text;
  return text
    .replace(/\b([A-Z]) ([a-z]+)\b/g, (_m, cap: string, rest: string) =>
      (cap + rest).toUpperCase(),
    );
}

/**
 * Remove API.Bible publisher debris from verse text (`#-#`, `#— #`, lone `#` anchors).
 * Exported so cached passages are cleaned on every load, not only at parse time.
 */
export function sanitizePubVerseText(text: string): string {
  let t = repairSplitInitialCaps(text);
  // # - # / #-# / #—# (with or without spaces, any common dash)
  t = t.replace(new RegExp(`#\\s*${PUB_DASH.source}\\s*#`, "g"), "\u2014");
  // Stray doubled hashes
  t = t.replace(/#\s*#/g, "\u2014");
  // Lone footnote/cross-ref hash before a word
  t = t.replace(/\s+#\s+(?=[A-Za-z0-9"(\[])/g, " ");
  t = t.replace(/([,.;:]|\u2014)\s*#\s+(?=[A-Za-z0-9])/g, "$1 ");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/\s+([,.!?;:])/g, "$1");
  return t;
}

/** API.Bible cross-ref anchors like `<span class="xo">#</span><span class="xt">—</span>…` → em dash. */
function normalizePubHtml(html: string): string {
  return html
    .replace(new RegExp(`#\\s*${PUB_DASH.source}\\s*#`, "g"), "\u2014")
    .replace(
      /<span\b[^>]*\bclass=["'][^"']*\bxo[^"']*["'][^>]*>\s*#\s*<\/span>\s*<span\b[^>]*\bclass=["'][^"']*\bxt[^"']*["'][^>]*>\s*[—–-]\s*<\/span>\s*<span\b[^>]*\bclass=["'][^"']*\bxo[^"']*["'][^>]*>\s*#\s*<\/span>/gi,
      "\u2014",
    )
    .replace(/<span\b[^>]*>\s*#\s*<\/span>/gi, "");
}

/** Drop footnotes / cross-refs before tag stripping (API.Bible leaves `#` anchor text otherwise). */
function stripPubMarkup(html: string): string {
  return html
    .replace(/<note\b[\s\S]*?<\/note>/gi, "")
    .replace(
      /<(?:span|a|sup|div)\b[^>]*\bclass=["'][^"']*\b(?:note|ft|fr|fk|fqa|fq|xt|xo|xop|xot|xnt|notelink|footnote|crossref|x)\b[^"']*["'][^>]*>[\s\S]*?<\/(?:span|a|sup|div)>/gi,
      "",
    );
}

function removeStrayPubMarkers(text: string): string {
  return sanitizePubVerseText(text);
}

/** API.Bible small caps: `<span class="sc">T</span>his` → `THIS` (print-style caps). */
function normalizeSmallCapsMarkup(html: string): string {
  return html.replace(
    /<span\b[^>]*\bclass=["'][^"']*\bsc\b[^"']*["'][^>]*>([A-Za-z])<\/span>([a-z]*)/gi,
    (_m, first: string, rest: string) => (first + rest).toUpperCase(),
  );
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|div|li|tr|td|th|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "");
}

function cleanText(raw: string): string {
  const normalized = normalizePubHtml(raw);
  const noPub = stripPubMarkup(normalized);
  const withSmallCaps = normalizeSmallCapsMarkup(noPub);
  const decoded = decodeEntities(stripHtmlTags(withSmallCaps));
  return removeStrayPubMarkers(decoded);
}

function extractVerseAnnotations(html: string): {
  html: string;
  crossRefs: NonNullable<PassageVerse["crossRefs"]>;
  footnotes: NonNullable<PassageVerse["footnotes"]>;
} {
  const crossRefs: NonNullable<PassageVerse["crossRefs"]> = [];
  const footnotes: NonNullable<PassageVerse["footnotes"]> = [];
  let footnoteIdx = 0;
  let work = html;

  work = work.replace(/<note\b[\s\S]*?<\/note>/gi, (noteHtml) => {
    footnoteIdx += 1;
    const text = cleanText(noteHtml);
    if (text) footnotes.push({ marker: footnoteIdx, text });
    return "";
  });

  work = work.replace(
    /<span\b[^>]*\bclass=["'][^"']*\bxt\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    (_m, rawLabel: string) => {
      const label = decodeEntities(rawLabel.replace(/^[\s—–-]+/, "").trim());
      if (!label || /^[—–-]+$/.test(label)) return "\u2014";
      const parsed = parseBibleReference(label);
      if (parsed?.verse) {
        crossRefs.push({
          label,
          book: parsed.bookAbbr,
          chapter: parsed.chapter,
          verse: parsed.verse,
        });
        return "";
      }
      return label;
    },
  );

  work = work.replace(/<span\b[^>]*\bclass=["'][^"']*\bxo[^"']*["'][^>]*>\s*#\s*<\/span>/gi, "");

  return { html: work, crossRefs, footnotes };
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
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : html.length;
    const slice = html.slice(start, end);
    const { html: annotated, crossRefs, footnotes } = extractVerseAnnotations(slice);
    const text = cleanText(annotated);
    if (text) {
      verses.push({
        number: markers[i].num,
        text,
        ...(crossRefs.length ? { crossRefs } : {}),
        ...(footnotes.length ? { footnotes } : {}),
      });
    }
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
  const verseMap = new Map<number, string>();
  const paragraphStarts: number[] = [];
  const headings: PassageHeading[] = [];
  let nextHeading: string | null = null;

  for (const block of blocks) {
    if (isHeadingBlock(block)) {
      const text = cleanText(block.replace(/^<p\b[^>]*>/i, "").replace(/<\/p>$/i, ""));
      if (text) nextHeading = text;
      continue;
    }
    if (!isTextBlock(block)) continue;

    const inner = block.replace(/^<p\b[^>]*>/i, "").replace(/<\/p>$/i, "");
    const blockVerses = extractVersesFromBlock(inner);
    if (blockVerses.length === 0) continue;

    paragraphStarts.push(blockVerses[0]!.number);
    if (nextHeading) {
      headings.push({ beforeVerse: blockVerses[0]!.number, text: nextHeading });
      nextHeading = null;
    }
    for (const v of blockVerses) verseMap.set(v.number, v.text);
  }

  const verses = [...verseMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, text]) => ({ number, text }));

  if (verses.length > 0 && paragraphStarts.length === 0) {
    paragraphStarts.push(verses[0]!.number);
  }

  return {
    reference,
    verses,
    paragraphStarts,
    headings,
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
    if (text) verses.push({ number: num, text });
  }
  return verses;
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
