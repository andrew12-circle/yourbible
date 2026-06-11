import { cn } from "@/lib/utils";
import {
  redLetterSegmentsForVerse,
  type Segment,
} from "@/lib/bible/redLetter";

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

export function buildVerseInnerHtml(
  verseNum: number,
  text: string,
  redSegments: Map<number, Segment[]>,
  escapeHtml: (s: string) => string,
): string {
  const segs = redLetterSegmentsForVerse(redSegments, verseNum, text);
  return segs
    .map((s) =>
      s.isJesus
        ? `<span class="red-letter">${escapeHtml(s.text)}</span>`
        : escapeHtml(s.text),
    )
    .join("");
}
