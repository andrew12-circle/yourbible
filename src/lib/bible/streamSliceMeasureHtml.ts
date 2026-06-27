import type { PassageVerse } from "@/lib/bible/api";
import { groupVersesIntoParagraphs, poetryLevelForVerse } from "@/lib/bible/parsePassageHtml";
import type { Segment } from "@/lib/bible/redLetter";
import {
  buildHolmanHeadingMeasureHtml,
  buildHolmanPageFootnotesMeasureHtml,
} from "@/lib/bible/holmanStudyLayout";
import type { ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";
import {
  buildVerseInnerHtml,
  scriptureParagraphClassNameMeasure,
  scripturePoetryClassNameMeasure,
  wrapVerseShellHtml,
} from "@/lib/bible/scriptureParagraph";
import { buildVerseXrefsInnerHtml } from "@/lib/bible/verseBodyRender";
import {
  headingsForChapter,
  paragraphStartsForChapter,
  poetryBlocksForChapter,
  type ReaderChapterPassage,
  type ReaderStreamUnit,
} from "@/lib/bible/readerStream";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/`/g, "&#96;");
}

export function verseGroupsFromStreamSlice(
  slice: ReaderStreamUnit[],
): { chapter: number; verses: PassageVerse[] }[] {
  const groups: { chapter: number; verses: PassageVerse[] }[] = [];
  let current: { chapter: number; verses: PassageVerse[] } | null = null;
  for (const unit of slice) {
    if (unit.kind !== "verse") continue;
    if (!current || current.chapter !== unit.chapter) {
      current = { chapter: unit.chapter, verses: [] };
      groups.push(current);
    }
    current.verses.push(unit.verse);
  }
  return groups;
}

/** HTML body for paginator measurement — mirrors live Scripture render output. */
export function buildStreamSliceMeasureHtml(
  slice: ReaderStreamUnit[],
  chapters: ReaderChapterPassage[],
  redByChapter: Map<string, Map<number, Segment[]>>,
  studyLayout: ResolvedStudyLayout,
): string {
  const parts: string[] = [];
  let batch: {
    bookAbbr: string;
    bookName: string;
    chapter: number;
    verses: PassageVerse[];
  } | null = null;

  const flushBatch = () => {
    if (!batch || batch.verses.length === 0) return;
    const paragraphStarts = new Set(
      paragraphStartsForChapter(chapters, batch.bookAbbr, batch.chapter),
    );
    const headingByVerse = new Map<number, string>();
    for (const h of headingsForChapter(chapters, batch.bookAbbr, batch.chapter)) {
      headingByVerse.set(h.beforeVerse, h.text);
    }
    const poetryBlocks = poetryBlocksForChapter(chapters, batch.bookAbbr, batch.chapter);
    const redSegments =
      redByChapter.get(`${batch.bookAbbr}|${batch.chapter}`) ??
      new Map<number, Segment[]>();
    const groups = groupVersesIntoParagraphs(batch.verses, paragraphStarts);
    for (const group of groups) {
      const first = group.verses[0]?.number;
      const heading = first != null ? headingByVerse.get(first) : undefined;
      const versesHtml = group.verses
        .map((v) => {
          const inner = buildVerseInnerHtml(
            v.number,
            v.text ?? "",
            redSegments,
            escapeHtml,
            v,
            studyLayout,
          );
          const xrefs = buildVerseXrefsInnerHtml(v, escapeHtml, studyLayout);
          return wrapVerseShellHtml(
            v.number,
            batch!.chapter,
            inner,
            group.isContinuation,
            xrefs,
          );
        })
        .join("");
      const poetryLevel = first != null ? poetryLevelForVerse(poetryBlocks, first) : 0;
      const paraClass =
        poetryLevel > 0
          ? scripturePoetryClassNameMeasure(poetryLevel, group.isContinuation)
          : scriptureParagraphClassNameMeasure(group.isContinuation);
      const paraHtml = `<p class="${paraClass}" style="orphans:2;widows:2">${versesHtml}</p>`;
      if (studyLayout === "holman") {
        if (heading) {
          parts.push(buildHolmanHeadingMeasureHtml(heading, batch!.bookAbbr, escapeHtml));
        }
        parts.push(paraHtml);
      } else {
        if (heading) {
          parts.push(`<p class="scripture-heading">${escapeHtml(heading)}</p>`);
        }
        parts.push(paraHtml);
      }
    }
    batch = null;
  };

  for (const unit of slice) {
    if (unit.kind === "plate") {
      flushBatch();
      parts.push(
        `<figure class="scripture-plate scripture-plate-measure"><img class="scripture-plate-image" src="${escapeAttr(unit.plate.imageUrl)}" alt="" /><figcaption class="scripture-plate-caption">${escapeHtml(unit.plate.title)} ${escapeHtml(unit.plate.referenceLabel)}</figcaption></figure>`,
      );
      continue;
    }
    if (unit.kind === "chapter-header") continue;
    if (unit.kind === "verse") {
      if (
        batch &&
        (batch.bookAbbr !== unit.bookAbbr || batch.chapter !== unit.chapter)
      ) {
        flushBatch();
      }
      if (!batch) {
        batch = {
          bookAbbr: unit.bookAbbr,
          bookName: unit.bookName,
          chapter: unit.chapter,
          verses: [],
        };
      }
      batch.verses.push(unit.verse);
    }
  }
  flushBatch();
  return parts.join("");
}

export function buildStreamSliceFootnotesMeasureHtml(
  slice: ReaderStreamUnit[],
): string {
  return buildHolmanPageFootnotesMeasureHtml(verseGroupsFromStreamSlice(slice), escapeHtml);
}
