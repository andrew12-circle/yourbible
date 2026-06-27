import { buildVerseInnerHtml, wrapVerseShellHtml } from "@/lib/bible/scriptureParagraph";
import type { PassageVerse } from "@/lib/bible/api";
import type { Segment } from "@/lib/bible/redLetter";
import type { ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";
import { makeVerseId } from "@/lib/bible/canonical/verseId";
import type { DocumentBlock } from "@/lib/bible/documentModel";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Shared HTML for paginator measurement — mirrors Scripture components. */
export function documentBlockToMeasureHtml(
  block: DocumentBlock,
  bookAbbr: string,
  chapter: number,
  redSegments: Map<number, Segment[]>,
  studyLayout: ResolvedStudyLayout,
  bibleId?: string,
): string {
  if (block.type === "heading") {
    return `<p class="scripture-heading">${escapeHtml(block.text)}</p>`;
  }
  const poetryClass =
    block.poetryLevel > 0
      ? `scripture-poetry-q${Math.min(block.poetryLevel, 3)}${block.isContinuation ? " scripture-poetry-cont" : ""}`
      : block.isContinuation
        ? "scripture-paragraph scripture-paragraph-cont"
        : "scripture-paragraph";
  const versesHtml = block.verses
    .map((v) => {
      const pv: PassageVerse = {
        number: v.number,
        text: v.text,
        parts: v.parts,
        crossRefs: v.crossRefs,
        footnotes: v.footnotes,
      };
      const inner = buildVerseInnerHtml(
        v.number,
        v.text,
        redSegments,
        escapeHtml,
        pv,
        studyLayout,
      );
      const verseId = v.verseId ?? makeVerseId(bibleId ?? "CSB", bookAbbr, chapter, v.number);
      return wrapVerseShellHtml(v.number, chapter, inner, block.isContinuation, "", verseId);
    })
    .join("");
  return `<p class="${poetryClass}" style="orphans:2;widows:2">${versesHtml}</p>`;
}
