import type { PassageVerse } from "@/lib/bible/api";
import { BOOKS } from "@/data/books";
import { buildVersePartsInnerHtml } from "@/lib/bible/verseBodyRender";
import { canonicalChapterToPassage } from "@/lib/bible/canonical/passageToCanonical";
import type { CanonicalChapterRecord } from "@/lib/bible/canonical/types";
import { sanitizePubVerseText } from "@/lib/bible/parsePassageHtml";
import { versePlainText } from "@/lib/bible/verseParts";

export type CanonicalVerseIssue = {
  bookAbbr: string;
  chapter: number;
  verse: number;
  kind:
    | "missing-text"
    | "text-parts-mismatch"
    | "render-length-mismatch"
    | "duplicate-verse"
    | "missing-verse";
  detail: string;
};

export type CanonicalChapterAudit = {
  bookAbbr: string;
  chapter: number;
  verseCount: number;
  issues: CanonicalVerseIssue[];
};

export type CanonicalBibleAudit = {
  chaptersAudited: number;
  versesAudited: number;
  issueCount: number;
  issues: CanonicalVerseIssue[];
  chapterIssues: CanonicalChapterAudit[];
};

function normalizeVerseText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Match reader body text — footnote markers are visible but not in versePlainText(). */
function stripRenderableVerseHtml(html: string): string {
  return stripHtml(
    html.replace(/<sup class="scripture-footnote-mark"[^>]*>[\s\S]*?<\/sup>/gi, ""),
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function auditCanonicalChapter(record: CanonicalChapterRecord): CanonicalChapterAudit {
  const passage = canonicalChapterToPassage(record);
  const issues: CanonicalVerseIssue[] = [];
  const seen = new Set<number>();

  for (const v of passage.verses) {
    if (seen.has(v.number)) {
      issues.push({
        bookAbbr: record.bookAbbr,
        chapter: record.chapter,
        verse: v.number,
        kind: "duplicate-verse",
        detail: `Verse ${v.number} appears more than once`,
      });
      continue;
    }
    seen.add(v.number);

    if (!v.text?.trim()) {
      issues.push({
        bookAbbr: record.bookAbbr,
        chapter: record.chapter,
        verse: v.number,
        kind: "missing-text",
        detail: "Verse text is empty",
      });
      continue;
    }

    const plain = versePlainText(v);
    const sanitizedParts = sanitizePubVerseText(plain);
    if (normalizeVerseText(sanitizedParts) !== normalizeVerseText(v.text)) {
      issues.push({
        bookAbbr: record.bookAbbr,
        chapter: record.chapter,
        verse: v.number,
        kind: "text-parts-mismatch",
        detail: `Stored text (${v.text.length} chars) does not match parts plain text (${plain.length} chars)`,
      });
    }

    const renderedHtml = buildVersePartsInnerHtml(v, new Map(), escapeHtml, "inline");
    const renderedPlain = stripRenderableVerseHtml(renderedHtml);
    const sanitizedRendered = sanitizePubVerseText(renderedPlain);
    if (sanitizedRendered.length < sanitizedParts.length) {
      issues.push({
        bookAbbr: record.bookAbbr,
        chapter: record.chapter,
        verse: v.number,
        kind: "render-length-mismatch",
        detail: `Rendered text missing ${sanitizedParts.length - sanitizedRendered.length} character(s): rendered ${sanitizedRendered.length}, expected ${sanitizedParts.length}`,
      });
    } else if (normalizeVerseText(sanitizedRendered) !== normalizeVerseText(sanitizedParts)) {
      issues.push({
        bookAbbr: record.bookAbbr,
        chapter: record.chapter,
        verse: v.number,
        kind: "render-length-mismatch",
        detail: `Rendered text differs from plain text (${sanitizedRendered.length} vs ${sanitizedParts.length} chars)`,
      });
    }
  }

  return {
    bookAbbr: record.bookAbbr,
    chapter: record.chapter,
    verseCount: passage.verses.length,
    issues,
  };
}

export function auditPassageVerse(v: PassageVerse, bookAbbr: string, chapter: number): CanonicalVerseIssue[] {
  return auditCanonicalChapter({
    key: `${bookAbbr}|${chapter}`,
    bibleId: "audit",
    bookAbbr,
    chapter,
    textRevision: "audit",
    parserRevision: "audit",
    verses: [
      {
        verseId: `${bookAbbr}:${chapter}:${v.number}`,
        bibleId: "audit",
        bookAbbr,
        bookOrder: 0,
        chapter,
        verse: v.number,
        text: v.text,
        textRevision: "audit",
      },
    ],
    layout: {
      bibleId: "audit",
      bookAbbr,
      chapter,
      paragraphStarts: [v.number],
      headings: [],
      poetryBlocks: [],
      studyByVerse: v.parts?.length
        ? [
            {
              verseId: `${bookAbbr}:${chapter}:${v.number}`,
              parts: v.parts,
              crossRefs: v.crossRefs,
              footnotes: v.footnotes,
            },
          ]
        : undefined,
    },
    cachedAt: 0,
  }).issues;
}

export function mergeChapterAudits(chapters: CanonicalChapterAudit[]): CanonicalBibleAudit {
  const issues = chapters.flatMap((c) => c.issues);
  const chapterIssues = chapters.filter((c) => c.issues.length > 0);
  return {
    chaptersAudited: chapters.length,
    versesAudited: chapters.reduce((sum, c) => sum + c.verseCount, 0),
    issueCount: issues.length,
    issues,
    chapterIssues,
  };
}

export function expectedChapterCount(): number {
  return BOOKS.reduce((sum, b) => sum + b.chapters, 0);
}
