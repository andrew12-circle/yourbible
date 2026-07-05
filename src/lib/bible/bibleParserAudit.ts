import { parsePassageHtml, parseVerseHtmlToParts } from "@/lib/bible/parsePassageHtml";

const PARAGRAPH_RE = /<p\b[^>]*>[\s\S]*?<\/p>/gi;
const PARAGRAPH_CLASS = /\bclass=["']([^"']+)["']/i;
const TEXT_PARAGRAPH_RE = /\b(p|m|pm|pmo|pmc|li\d?|q\d?)\b/;
const HEADING_CLASS_RE = /\b(s\d?|ms\d?|d)\b/;
const VERSE_MARKER =
  /<(?:span|sup)\b[^>]*\bclass=["'][^"']*\bv\b[^"']*["'][^>]*>\s*(\d+)\s*<\/(?:span|sup)>/i;

function paragraphClass(block: string): string {
  return PARAGRAPH_CLASS.exec(block)?.[1] ?? "";
}

function blockHasVerseMarker(block: string): boolean {
  return VERSE_MARKER.test(block);
}

function isHeadingBlock(block: string): boolean {
  if (blockHasVerseMarker(block)) return false;
  return HEADING_CLASS_RE.test(paragraphClass(block));
}

function isVerselessTextBlock(block: string): boolean {
  if (blockHasVerseMarker(block)) return false;
  if (isHeadingBlock(block)) return false;
  const cls = paragraphClass(block);
  if (!cls) return false;
  return TEXT_PARAGRAPH_RE.test(cls);
}

function normalizeAuditText(text: string): string {
  return text
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\s+(['’])/g, "$1")
    .trim()
    .toLowerCase();
}

function isTextMerged(blockText: string, parsedText: string): boolean {
  const norm = normalizeAuditText(blockText);
  if (!norm) return true;
  const parsedNorm = normalizeAuditText(parsedText);
  if (parsedNorm.includes(norm)) return true;
  const words = norm.replace(/[^\w\s']/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  let haystack = parsedNorm;
  for (const word of words) {
    const idx = haystack.indexOf(word);
    if (idx === -1) return false;
    haystack = haystack.slice(idx + word.length);
  }
  return true;
}

function blockPlainText(block: string): string {
  const inner = block.replace(/^<p\b[^>]*>/i, "").replace(/<\/p>$/i, "");
  const { parts } = parseVerseHtmlToParts(inner);
  return parts
    .filter((p): p is Extract<(typeof parts)[number], { kind: "text" }> => p.kind === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
}

/** Verseless paragraph text from HTML that did not land in parsed verse bodies. */
export function findDroppedVerselessText(html: string, parsedVerseText: string): string {
  const blocks = [...html.matchAll(PARAGRAPH_RE)].map((m) => m[0]);
  let dropped = "";
  for (const block of blocks) {
    if (!isVerselessTextBlock(block)) continue;
    const text = blockPlainText(block);
    if (!isTextMerged(text, parsedVerseText)) {
      dropped += `${text} `;
    }
  }
  return dropped.trim();
}

export interface ChapterParseAudit {
  verseCount: number;
  parsedCharCount: number;
  orphanCharCount: number;
  orphanTextPreview: string;
}

/** Returns verseless source text that should have been merged into verses but was not. */
export function auditChapterHtmlParse(html: string): ChapterParseAudit {
  const parsed = parsePassageHtml(html);
  const parsedText = parsed.verses.map((v) => v.text).join(" ");
  const orphanText = findDroppedVerselessText(html, parsedText);
  return {
    verseCount: parsed.verses.length,
    parsedCharCount: parsedText.length,
    orphanCharCount: orphanText.length,
    orphanTextPreview: orphanText.slice(0, 120),
  };
}

export function chapterParseIsComplete(audit: ChapterParseAudit): boolean {
  return audit.orphanCharCount === 0 && audit.verseCount > 0;
}
