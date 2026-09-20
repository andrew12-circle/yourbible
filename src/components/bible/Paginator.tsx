import { useEffect, useMemo, useRef } from "react";
import { useFontLoadRevision } from "@/hooks/useFontLoadRevision";
import type { PassageVerse, PoetryBlock } from "@/lib/bible/api";
import { splitJesusSpeechForChapter } from "@/lib/bible/redLetter";
import type { ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";
import type { ReaderChapterPassage, ReaderStreamUnit } from "@/lib/bible/readerStream";
import { buildStreamSliceMeasureHtml, buildStreamSliceFootnotesMeasureHtml } from "@/lib/bible/streamSliceMeasureHtml";
import { applyScriptureColumnMeasureHtml, applyHolmanStudyMeasureHtml, scriptureContentFitsPage } from "@/lib/bible/readerColumnMeasure";
import { cn } from "@/lib/utils";

interface Props {
  verses: PassageVerse[];
  paragraphStarts: number[];
  headings?: { beforeVerse: number; text: string }[];
  poetryBlocks?: PoetryBlock[];
  bookAbbr: string;
  chapter: number;
  pageWidth: number;
  pageHeight: number;
  firstPageHeight?: number;
  className?: string;
  columnsClassName?: string;
  footerHeight?: number;
  fontSizeStyle?: React.CSSProperties;
  studyLayout?: ResolvedStudyLayout;
  measurementKey?: string;
  onSplitsChange: (splits: number[]) => void;
}
const EMPTY_HEADINGS: NonNullable<Props["headings"]> = [];
const EMPTY_POETRY: PoetryBlock[] = [];

/** Single-page measurement uses the same paragraph, poetry and footnote renderer as spreads. */
export function Paginator({ verses, paragraphStarts, headings = EMPTY_HEADINGS, poetryBlocks = EMPTY_POETRY, bookAbbr, chapter, pageWidth, pageHeight, firstPageHeight, className, columnsClassName, footerHeight = 0, fontSizeStyle, studyLayout = "inline", measurementKey, onSplitsChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fontLoadRevision = useFontLoadRevision();
  const chapters = useMemo<ReaderChapterPassage[]>(() => [{ bookAbbr, bookName: bookAbbr, chapter, verses, paragraphStarts, headings, poetryBlocks }], [bookAbbr, chapter, verses, paragraphStarts, headings, poetryBlocks]);
  const stream = useMemo<ReaderStreamUnit[]>(() => verses.map((verse) => ({ kind: "verse", bookAbbr, bookName: bookAbbr, chapter, verse })), [verses, bookAbbr, chapter]);
  const red = useMemo(() => new Map([[`${bookAbbr}|${chapter}`, splitJesusSpeechForChapter(bookAbbr, chapter, verses)]]), [bookAbbr, chapter, verses]);
  const contentKey = JSON.stringify(chapters);
  const resolvedFirstPageHeight = firstPageHeight ?? pageHeight;
  const fontSize = fontSizeStyle?.fontSize;
  const fontFamily = fontSizeStyle?.fontFamily;
  useEffect(() => {
    const node = ref.current;
    if (!node || pageWidth <= 0 || pageHeight <= 0 || !stream.length) return;
    const fits = (start: number, end: number, limit: number) => {
      const slice = stream.slice(start, end);
      const body = buildStreamSliceMeasureHtml(slice, chapters, red, studyLayout);
      const footnotes = buildStreamSliceFootnotesMeasureHtml(slice);
      if (studyLayout === "holman" || footnotes) applyHolmanStudyMeasureHtml(node, body, "", footnotes, columnsClassName, limit);
      else applyScriptureColumnMeasureHtml(node, body, columnsClassName, limit);
      return scriptureContentFitsPage(node, limit, columnsClassName);
    };
    const splits = [0];
    let start = 0;
    while (start < stream.length) {
      const limit = Math.max(1, (start === 0 ? resolvedFirstPageHeight : pageHeight) - footerHeight);
      let lastFit = start;
      let count = 1;
      while (start + count <= stream.length && fits(start, start + count, limit)) { lastFit = start + count; count *= 2; }
      let lo = lastFit + 1;
      let hi = Math.min(start + count, stream.length);
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (fits(start, mid, limit)) { lastFit = mid; lo = mid + 1; }
        else hi = mid - 1;
      }
      start = Math.max(start + 1, lastFit);
      splits.push(start);
    }
    onSplitsChange(splits);
    // Content serialization prevents equal-length edits or new notes from reusing stale measurements.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, pageWidth, pageHeight, resolvedFirstPageHeight, footerHeight, className, columnsClassName, studyLayout, measurementKey, fontSize, fontFamily, fontLoadRevision, onSplitsChange]);
  return <div aria-hidden style={{ position: "fixed", top: -99999, left: -99999, width: pageWidth, visibility: "hidden", pointerEvents: "none" }}>
    <div ref={ref} data-reading-area className={cn(className, studyLayout === "holman" && "reader-holman-study")} style={{ width: pageWidth, ...fontSizeStyle }} />
  </div>;
}
