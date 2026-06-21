import { cn } from "@/lib/utils";
import {
  redLetterSegmentsForVerse,
  type Segment,
} from "@/lib/bible/redLetter";
import type { PassageVerse } from "@/lib/bible/api";
import {
  poetryParagraphClassName,
  styledTextClass,
  verseParts,
  versePlainText,
} from "@/lib/bible/verseParts";
import { buildVersePartsInnerHtml } from "@/lib/bible/verseBodyRender";

export function scriptureParagraphClassName(isContinuation: boolean): string {
  return cn(
    "scripture-paragraph text-justify hyphens-auto",
    isContinuation && "scripture-paragraph-continue",
  );
}

export function scriptureParagraphClassNameMeasure(isContinuation: boolean): string {
  return cn(
    "scripture-paragraph text-justify",
    isContinuation && "scripture-paragraph-continue",
  );
}

export function scripturePoetryClassName(level: number, isContinuation: boolean): string {
  const poetry = poetryParagraphClassName(level, isContinuation);
  return cn(
    poetry || scriptureParagraphClassName(isContinuation),
    poetry ? "text-justify hyphens-auto" : "",
  );
}

export function scripturePoetryClassNameMeasure(level: number, isContinuation: boolean): string {
  const poetry = poetryParagraphClassName(level, isContinuation);
  return cn(
    poetry || scriptureParagraphClassNameMeasure(isContinuation),
    poetry ? "text-justify" : "",
  );
}

export function buildVerseInnerHtml(
  verseNum: number,
  text: string,
  redSegments: Map<number, Segment[]>,
  escapeHtml: (s: string) => string,
  verse?: PassageVerse,
): string {
  if (verse?.parts && verse.parts.length > 0) {
    return buildVersePartsInnerHtml(verse, redSegments, escapeHtml);
  }
  const segs = redLetterSegmentsForVerse(redSegments, verseNum, text);
  return segs
    .map((s) =>
      s.isJesus
        ? `<span class="red-letter">${escapeHtml(s.text)}</span>`
        : escapeHtml(s.text),
    )
    .join("");
}

/** Large chapter numeral beside verse 1 — like a printed study Bible. */
export function shouldShowChapterDropCap(
  verseNumber: number,
  paragraphIsContinuation: boolean,
): boolean {
  return verseNumber === 1 && !paragraphIsContinuation;
}

/** Outer verse shell for paginator measurement (must match live reader DOM). */
export function wrapVerseShellHtml(
  verseNum: number,
  chapter: number,
  innerHtml: string,
  paragraphIsContinuation: boolean,
): string {
  const body = `<span class="verse-body-wrap"><span data-verse-body="${verseNum}">${innerHtml}</span></span>`;
  if (shouldShowChapterDropCap(verseNum, paragraphIsContinuation)) {
    return `<span class="scripture-verse scripture-verse-chapter-open" data-verse="${verseNum}"><span class="chapter-drop-cap">${chapter}</span>${body}</span> `;
  }
  return `<span class="scripture-verse" data-verse="${verseNum}"><span class="verse-num verse-num-gutter">${verseNum}</span>${body}</span> `;
}

export { verseParts, versePlainText, styledTextClass };
