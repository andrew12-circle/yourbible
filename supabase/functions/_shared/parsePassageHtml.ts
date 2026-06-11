export interface PassageVerse {
  number: number;
  text: string;
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

/** Repair text when inline HTML tags were replaced with spaces (CSB small-cap spans). */
function joinSmallCapSpan(first: string, rest: string): string {
  if (!rest) return first;
  if (first === "I") {
    if (rest.length === 1) return (first + rest).toUpperCase();
    return `${first} ${rest}`;
  }
  if (rest.length <= 3) return (first + rest).toUpperCase();
  return first + rest;
}

function repairGluedPronounI(text: string): string {
  return text.replace(/\bI([A-Z][A-Za-z']+)/g, (_m, tail: string) => `I ${tail.toLowerCase()}`);
}

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
export function sanitizePubVerseText(text: string): string {
  let t = repairGluedPronounI(text);
  t = repairSplitInitialCaps(t);
  t = t.replace(new RegExp(`#\\s*${PUB_DASH.source}\\s*#`, "g"), "\u2014");
  t = t.replace(/#\s*#/g, "\u2014");
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

/** API.Bible small caps: `<span class="sc">T</span>his` → inscription `THIS`; keep `I` separate. */
function normalizeSmallCapsMarkup(html: string): string {
  return html.replace(
    /<span\b[^>]*\bclass=["'][^"']*\bsc\b[^"']*["'][^>]*>([A-Za-z])<\/span>([a-z]*)/gi,
    (_m, first: string, rest: string) => joinSmallCapSpan(first, rest),
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
    const text = cleanText(html.slice(start, end));
    if (text) verses.push({ number: markers[i].num, text });
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
