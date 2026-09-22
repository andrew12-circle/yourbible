import { useEffect, useMemo, useRef } from "react";
import { useFontLoadRevision } from "@/hooks/useFontLoadRevision";
import { splitJesusSpeechForChapter } from "@/lib/bible/redLetter";
import { applyScriptureColumnMeasureHtml, applyHolmanStudyMeasureHtml, paginatorSpreadPaneLimitPx, readerPageContentLimitPx, scriptureContentFitsPage } from "@/lib/bible/readerColumnMeasure";
import { buildReaderStream, type ReaderChapterPassage, type ReaderPlateFocus, type ReaderStreamUnit } from "@/lib/bible/readerStream";
import { buildStreamSliceMeasureHtml, buildStreamSliceFootnotesMeasureHtml } from "@/lib/bible/streamSliceMeasureHtml";
import { paginateReaderStream } from "@/lib/bible/paginateReaderStream";
import { ReaderPageHistory, readerPageHistoryForRoot } from "@/lib/bible/readerPageHistory";
import { readerAppendedPagePrefix, type ReaderAppendPaginationSnapshot } from "@/lib/bible/readerAppendPagination";
import type { ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";
import { readerPageFootnotesEnabled } from "@/lib/bible/holmanStudyLayout";
import { cn } from "@/lib/utils";
interface Props {
  chapters: ReaderChapterPassage[];
  readerStream?: ReaderStreamUnit[];
  plateFocus?: ReaderPlateFocus;
  pageWidth: number;
  pageHeight: number;
  firstPageHeight?: number;
  className?: string;
  columnsClassName?: string;
  footerHeight?: number;
  fontSizeStyle?: React.CSSProperties;
  spreadMode?: boolean;
  studyLayout?: ResolvedStudyLayout;
  measurementKey?: string;
  fixedPrefix?: readonly number[];
  onSplitsChange: (splits: number[]) => void;
}
/** Each physical page is measured independently, with identical live typography.
 * Two columns per page still read left-column → right-column → next page.
 * Images never enter hidden text measurement or change breaks after decoding.
 */
export function BookPaginator({ chapters, readerStream, plateFocus, pageWidth, pageHeight, firstPageHeight, className, columnsClassName, footerHeight = 0, fontSizeStyle, spreadMode = false, studyLayout = "inline", measurementKey, fixedPrefix, onSplitsChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastMeasurement = useRef<ReaderAppendPaginationSnapshot | null>(null);
  const pageHistory = useRef(new ReaderPageHistory());
  const fontLoadRevision = useFontLoadRevision();
  const stream = useMemo(() => readerStream ?? buildReaderStream(chapters, { plateFocus }), [readerStream, chapters, plateFocus]);
  const redByChapter = useMemo(() => new Map(chapters.map((ch) => [`${ch.bookAbbr}|${ch.chapter}`, splitJesusSpeechForChapter(ch.bookAbbr, ch.chapter, ch.verses)])), [chapters]);
  const contentKey = JSON.stringify([chapters, stream]);
  const resolvedFirstPageHeight = firstPageHeight ?? pageHeight;
  const fontSize = fontSizeStyle?.fontSize;
  const fontFamily = fontSizeStyle?.fontFamily;
  useEffect(() => {
    const node = ref.current;
    if (!node || pageWidth <= 0 || pageHeight <= 0 || !stream.length) return;
    const layoutKey = JSON.stringify([pageWidth, pageHeight, resolvedFirstPageHeight,
      footerHeight, className, columnsClassName, spreadMode, studyLayout,
      fontSizeStyle, fontLoadRevision, plateFocus]);
    const geometryKey = JSON.stringify([pageWidth, pageHeight, resolvedFirstPageHeight,
      className, columnsClassName, spreadMode, studyLayout, fontSizeStyle, fontLoadRevision, plateFocus]);
    const readerRoot = node.closest("[data-bible-reader]");
    const history = readerRoot ? readerPageHistoryForRoot(readerRoot) : pageHistory.current;
    const remembered = history.find(geometryKey, footerHeight, chapters, stream, fixedPrefix);
    if (remembered) {
      lastMeasurement.current = { layoutKey, chapters, stream, splits: remembered };
      onSplitsChange(remembered);
      return;
    }
    const appendPrefix = readerAppendedPagePrefix(lastMeasurement.current, layoutKey, chapters, stream);
    const splits = paginateReaderStream(stream, (start, end, pageIndex) => {
      const baseLimit = readerPageContentLimitPx({ pageIndex, startsWithChapterHeader: stream[start].kind === "chapter-header", firstPageHeight: resolvedFirstPageHeight, pageHeight, footerGuardPx: footerHeight, chapterHeaderReservePx: 0 });
      const limit = spreadMode && columnsClassName ? paginatorSpreadPaneLimitPx(baseLimit) : baseLimit;
      const slice = stream.slice(start, end);
      const html = buildStreamSliceMeasureHtml(slice, chapters, redByChapter, studyLayout);
      const notes = readerPageFootnotesEnabled(false) ? buildStreamSliceFootnotesMeasureHtml(slice) : "";
      const options = spreadMode && columnsClassName ? { columnCount: 2 as const, measureWidthPx: pageWidth } : undefined;
      if (studyLayout === "holman" || notes) applyHolmanStudyMeasureHtml(node, html, "", notes, columnsClassName, limit, options);
      else applyScriptureColumnMeasureHtml(node, html, columnsClassName, limit, options);
      return scriptureContentFitsPage(node, limit, columnsClassName);
    }, fixedPrefix ?? appendPrefix);
    lastMeasurement.current = { layoutKey, chapters, stream, splits };
    history.remember({ geometryKey, footerHeight, chapters, stream, splits });
    onSplitsChange(splits);
    // Serialized content includes notes, poetry and equal-length text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, plateFocus?.bookAbbr, plateFocus?.chapter, pageWidth, pageHeight, resolvedFirstPageHeight, footerHeight, className, columnsClassName, spreadMode, studyLayout, measurementKey, fixedPrefix, fontSize, fontFamily, fontLoadRevision, onSplitsChange]);
  return <div aria-hidden style={{ position: "fixed", top: -99999, left: -99999, width: pageWidth, visibility: "hidden", pointerEvents: "none" }}>
    <div ref={ref} data-reading-area className={cn(className, studyLayout === "holman" && "reader-holman-study")} style={{ display: "flow-root", width: pageWidth, ...fontSizeStyle }} />
  </div>;
}
