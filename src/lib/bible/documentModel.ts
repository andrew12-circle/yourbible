import type { PassageVerse, PoetryBlock } from "@/lib/bible/api";
import type { Segment as JesusSegment } from "@/lib/bible/redLetter";
import type { VersePart } from "@/lib/bible/api";
import type { ChapterLayout, CanonicalVerse } from "@/lib/bible/canonical/types";
import { makeVerseId } from "@/lib/bible/canonical/verseId";
import {
  groupVersesIntoParagraphs,
  poetryLevelForVerse,
} from "@/lib/bible/parsePassageHtml";

export type RenderVerse = {
  verseId: string;
  number: number;
  text: string;
  parts?: VersePart[];
  crossRefs?: PassageVerse["crossRefs"];
  footnotes?: PassageVerse["footnotes"];
  redLetter?: JesusSegment[];
};

export type DocumentBlock =
  | { type: "heading"; text: string; beforeVerseId: string; bookAbbr: string; chapter: number }
  | {
      type: "paragraph";
      poetryLevel: number;
      isContinuation: boolean;
      bookAbbr: string;
      chapter: number;
      verses: RenderVerse[];
    };

export function canonicalVersesToPassageVerses(
  verses: CanonicalVerse[],
  layout: ChapterLayout,
): PassageVerse[] {
  const studyById = new Map(
    (layout.studyByVerse ?? []).map((s) => [s.verseId, s]),
  );
  return verses.map((cv) => {
    const study = studyById.get(cv.verseId);
    return {
      number: cv.verse,
      text: cv.text,
      parts: study?.parts,
      crossRefs: study?.crossRefs,
      footnotes: study?.footnotes,
    };
  });
}

export function buildDocumentBlocks(
  verses: CanonicalVerse[],
  layout: ChapterLayout,
  redLetterByVerse?: Map<number, JesusSegment[]>,
  bibleId?: string,
): DocumentBlock[] {
  const passageVerses = canonicalVersesToPassageVerses(verses, layout);
  const paragraphStarts = new Set(layout.paragraphStarts);
  const headingMap = new Map(layout.headings.map((h) => [h.beforeVerse, h.text]));
  const poetryBlocks: PoetryBlock[] = layout.poetryBlocks;
  const blocks: DocumentBlock[] = [];
  const bid = bibleId ?? layout.bibleId;

  for (const group of groupVersesIntoParagraphs(passageVerses, paragraphStarts)) {
    const first = group.verses[0]?.number;
    const heading = first != null ? headingMap.get(first) : undefined;
    if (heading && first != null) {
      blocks.push({
        type: "heading",
        text: heading,
        beforeVerseId: makeVerseId(bid, layout.bookAbbr, layout.chapter, first),
        bookAbbr: layout.bookAbbr,
        chapter: layout.chapter,
      });
    }
    const poetryLevel = first != null ? poetryLevelForVerse(poetryBlocks, first) : 0;
    blocks.push({
      type: "paragraph",
      poetryLevel,
      isContinuation: group.isContinuation,
      bookAbbr: layout.bookAbbr,
      chapter: layout.chapter,
      verses: group.verses.map((v) => ({
        verseId: makeVerseId(bid, layout.bookAbbr, layout.chapter, v.number),
        number: v.number,
        text: v.text,
        parts: v.parts,
        crossRefs: v.crossRefs,
        footnotes: v.footnotes,
        redLetter: redLetterByVerse?.get(v.number),
      })),
    });
  }

  return blocks;
}

export function documentBlocksToVerseGroups(
  blocks: DocumentBlock[],
): { bookAbbr: string; chapter: number; verses: PassageVerse[] }[] {
  const byChapter = new Map<string, PassageVerse[]>();
  for (const block of blocks) {
    if (block.type !== "paragraph") continue;
    const key = `${block.bookAbbr}|${block.chapter}`;
    const list = byChapter.get(key) ?? [];
    for (const v of block.verses) {
      list.push({
        number: v.number,
        text: v.text,
        parts: v.parts,
        crossRefs: v.crossRefs,
        footnotes: v.footnotes,
      });
    }
    byChapter.set(key, list);
  }
  return [...byChapter.entries()].map(([key, verses]) => {
    const [bookAbbr, chapter] = key.split("|");
    return { bookAbbr: bookAbbr!, chapter: Number(chapter), verses };
  });
}
