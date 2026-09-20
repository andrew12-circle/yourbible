import { Fragment, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PassageVerse } from "@/lib/bible/api";
import type { Segment } from "@/lib/bible/redLetter";
import { buildHolmanPageFootnotesMeasureHtml } from "@/lib/bible/holmanStudyLayout";
import type { ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";
import { createReaderVerseRenderer } from "@/lib/bible/readerVerseNode";
import { renderScriptureParagraphNodes } from "@/lib/bible/readerScriptureRender";
import {
  headingsForChapter, paragraphStartsForChapter, poetryBlocksForChapter,
  type ReaderChapterPassage, type ReaderStreamUnit,
} from "@/lib/bible/readerStream";
import { biblePlateAssetUrl } from "@/lib/bible/biblePlateAssets";

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
    // Measure the actual React paragraph and verse markup. A separate HTML
    // approximation drifts on button widths, poetry, continuation and spacing.
    const renderVerse = createReaderVerseRenderer({
      bibleId: "measure", bookAbbr: batch.bookAbbr, chapter: batch.chapter,
      useBookSpread: true, studyLayout, redSegments: new Map(),
      redSegmentsByChapter: redByChapter,
      ulFor: () => undefined, hlsFor: () => [], noteFor: () => undefined,
      onVerseNumberClick: () => {}, navigate: () => {}, setNoteOpen: () => {},
    });
    const nodes = renderScriptureParagraphNodes(
      [batch],
      (book, chapter) => new Set(paragraphStartsForChapter(chapters, book, chapter)),
      (book, chapter) => new Map(headingsForChapter(chapters, book, chapter).map((heading) => [heading.beforeVerse, heading.text])),
      renderVerse,
      (book, chapter) => poetryBlocksForChapter(chapters, book, chapter),
      { studyLayout },
    );
    parts.push(renderToStaticMarkup(createElement(Fragment, null, nodes)));
    batch = null;
  };

  for (const unit of slice) {
    if (unit.kind === "plate") {
      flushBatch();
      parts.push(
        `<figure class="scripture-plate scripture-plate-measure"><img class="scripture-plate-image" src="${escapeAttr(biblePlateAssetUrl(unit.plate))}" alt="" /><figcaption class="scripture-plate-caption">${escapeHtml(unit.plate.title)} ${escapeHtml(unit.plate.referenceLabel)}</figcaption></figure>`,
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
