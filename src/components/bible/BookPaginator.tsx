import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { splitJesusSpeechForChapter, type Segment } from "@/lib/bible/redLetter";
import {
  applyScriptureColumnMeasureHtml,
  applyHolmanStudyMeasureHtml,
  paginatorMeasureLimitPx,
  readerPageContentLimitPx,
  scriptureContentFitsPage,
  type ScriptureColumnMeasureOptions,
} from "@/lib/bible/readerColumnMeasure";
import { READER_SPREAD_COLUMNS_CLASS } from "@/lib/bible/readerColumnLayout";
import {
  type ReaderChapterPassage,
  type ReaderStreamUnit,
  buildReaderStream,
  READER_PAGINATOR_SPLIT_REVISION,
} from "@/lib/bible/readerStream";
import {
  buildStreamSliceFootnotesMeasureHtml,
  buildStreamSliceMeasureHtml,
} from "@/lib/bible/streamSliceMeasureHtml";
import type { ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";
import { cn } from "@/lib/utils";

interface Props {
  chapters: ReaderChapterPassage[];
  pageWidth: number;
  pageHeight: number;
  firstPageHeight?: number;
  className?: string;
  columnsClassName?: string;
  footerHeight?: number;
  fontSizeStyle?: React.CSSProperties;
  /** Two-page spread with two columns per page — paginate as L-col1 → L-col2 → R-col1 → R-col2. */
  spreadMode?: boolean;
  studyLayout?: ResolvedStudyLayout;
  onSplitsChange: (splits: number[]) => void;
}

export function BookPaginator({
  chapters,
  pageWidth,
  pageHeight,
  firstPageHeight,
  className,
  columnsClassName,
  footerHeight = 0,
  fontSizeStyle,
  spreadMode = false,
  studyLayout = "inline",
  onSplitsChange,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [measureNodeReady, setMeasureNodeReady] = useState(false);
  const bindMeasureRef = useCallback((el: HTMLDivElement | null) => {
    ref.current = el;
    setMeasureNodeReady(el != null);
  }, []);
  const [revision, setRevision] = useState(0);
  const lastSplitsRef = useRef<string>("");
  const stream = useMemo(() => buildReaderStream(chapters), [chapters]);

  const redByChapter = useMemo(() => {
    const m = new Map<string, Map<number, Segment[]>>();
    for (const ch of chapters) {
      const key = `${ch.bookAbbr}|${ch.chapter}`;
      m.set(key, splitJesusSpeechForChapter(ch.bookAbbr, ch.chapter, ch.verses));
    }
    return m;
  }, [chapters]);

  const chaptersKey = useMemo(
    () =>
      chapters
        .map(
          (ch) =>
            `${ch.bookAbbr}:${ch.chapter}:${ch.verses.map((v) => `${v.number}:${v.text.length}`).join(",")}`,
        )
        .join("|"),
    [chapters],
  );

  const resolvedFirstPageHeight = firstPageHeight ?? pageHeight;
  const spreadMeasureWidth = pageWidth * 2;

  useEffect(() => {
    lastSplitsRef.current = "";
    setRevision((r) => r + 1);
  }, [
    chaptersKey,
    pageWidth,
    pageHeight,
    resolvedFirstPageHeight,
    footerHeight,
    className,
    columnsClassName,
    spreadMode,
    studyLayout,
    measureNodeReady,
    fontSizeStyle?.fontSize,
    fontSizeStyle?.fontFamily,
    READER_PAGINATOR_SPLIT_REVISION,
  ]);

  useEffect(() => {
    if (!ref.current || pageHeight <= 0 || stream.length === 0) {
      if (spreadMode && columnsClassName) return;
      const next = [0, stream.length];
      const key = next.join(",");
      if (lastSplitsRef.current !== key) {
        lastSplitsRef.current = key;
        onSplitsChange(next);
      }
      return;
    }
    const node = ref.current;
    const splits: number[] = [0];
    let i = 0;
    let pageIndex = 0;
    const useSpreadColumns = Boolean(spreadMode && columnsClassName);
    const spreadMeasureOpts2: ScriptureColumnMeasureOptions = {
      columnCount: 2,
      measureWidthPx: pageWidth,
    };
    const spreadMeasureOpts4: ScriptureColumnMeasureOptions = {
      columnCount: 4,
      measureWidthPx: spreadMeasureWidth,
    };

    while (i < stream.length) {
      if (stream[i]?.kind === "plate") {
        splits.push(i + 1);
        i += 1;
        pageIndex += 1;
        continue;
      }

      if (useSpreadColumns) {
        const spreadStart = i;
        const spreadStartsWithHeader = stream[i]?.kind === "chapter-header";
        const leftLimit = readerPageContentLimitPx({
          pageIndex,
          startsWithChapterHeader: spreadStartsWithHeader,
          firstPageHeight: resolvedFirstPageHeight,
          pageHeight,
          footerGuardPx: footerHeight,
        });
        const rightStartsAtHeader =
          stream[spreadStart + 1]?.kind === "chapter-header" ||
          (stream[spreadStart + 1]?.kind !== "verse" &&
            stream[spreadStart + 2]?.kind === "chapter-header");
        const rightLimit = readerPageContentLimitPx({
          pageIndex: pageIndex + 1,
          startsWithChapterHeader: rightStartsAtHeader,
          firstPageHeight: resolvedFirstPageHeight,
          pageHeight,
          footerGuardPx: footerHeight,
        });
        const spreadLimit = Math.min(leftLimit, rightLimit);
        const leftMeasureLimit = paginatorMeasureLimitPx(leftLimit);
        const rightMeasureLimit = paginatorMeasureLimitPx(rightLimit);
        const spreadMeasureLimit = paginatorMeasureLimitPx(spreadLimit);
        const leftOnlyEnd = findStreamSliceEnd(
          node,
          stream,
          spreadStart,
          stream.length,
          chapters,
          redByChapter,
          columnsClassName,
          leftMeasureLimit,
          studyLayout,
          spreadMeasureOpts2,
        );
        let sequentialSpreadEnd = findStreamSliceEnd(
          node,
          stream,
          leftOnlyEnd,
          stream.length,
          chapters,
          redByChapter,
          columnsClassName,
          rightMeasureLimit,
          studyLayout,
          spreadMeasureOpts2,
        );
        if (sequentialSpreadEnd <= leftOnlyEnd) {
          sequentialSpreadEnd = leftOnlyEnd + 1;
        }
        const spreadCap4 = findStreamSliceEnd(
          node,
          stream,
          spreadStart,
          stream.length,
          chapters,
          redByChapter,
          READER_SPREAD_COLUMNS_CLASS,
          spreadMeasureLimit,
          studyLayout,
          spreadMeasureOpts4,
        );
        const spreadEnd = Math.min(
          spreadCap4 > spreadStart ? spreadCap4 : spreadStart + 1,
          sequentialSpreadEnd,
        );
        if (spreadEnd <= spreadStart + 1) {
          splits.push(spreadStart + 1);
          i = spreadStart + 1;
          pageIndex += 1;
          continue;
        }
        const leftPageEnd = findSpreadLeftPageEnd(
          node,
          stream,
          spreadStart,
          spreadEnd,
          leftMeasureLimit,
          rightMeasureLimit,
          chapters,
          redByChapter,
          columnsClassName,
          studyLayout,
          spreadMeasureOpts2,
        );
        splits.push(leftPageEnd);
        splits.push(spreadEnd);
        i = spreadEnd;
        pageIndex += 2;
        continue;
      }

      const startsWithHeader = stream[i]?.kind === "chapter-header";
      const limit = readerPageContentLimitPx({
        pageIndex,
        startsWithChapterHeader: startsWithHeader,
        firstPageHeight: resolvedFirstPageHeight,
        pageHeight,
        footerGuardPx: footerHeight,
      });
      const lastFit = findStreamSliceEnd(
        node,
        stream,
        i,
        stream.length,
        chapters,
        redByChapter,
        columnsClassName,
        paginatorMeasureLimitPx(limit),
        studyLayout,
      );
      splits.push(lastFit);
      i = lastFit;
      pageIndex += 1;
    }
    const key = splits.join(",");
    if (lastSplitsRef.current !== key) {
      lastSplitsRef.current = key;
      onSplitsChange(splits);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: -99999,
        left: -99999,
        width: spreadMode && columnsClassName ? spreadMeasureWidth : pageWidth,
        visibility: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        ref={bindMeasureRef}
        data-reading-area
        className={cn(className, studyLayout === "holman" && "reader-holman-study")}
        style={{
          width: spreadMode && columnsClassName ? spreadMeasureWidth : pageWidth,
          ...fontSizeStyle,
        }}
      />
    </div>
  );
}

function streamSliceFitsPage(
  node: HTMLDivElement,
  stream: ReaderStreamUnit[],
  start: number,
  end: number,
  chapters: ReaderChapterPassage[],
  redByChapter: Map<string, Map<number, Segment[]>>,
  columnsClassName: string | undefined,
  contentHeightPx: number,
  studyLayout: ResolvedStudyLayout,
  measureOptions?: ScriptureColumnMeasureOptions,
): boolean {
  if (start >= end) return true;
  renderStreamSlice(
    node,
    stream.slice(start, end),
    chapters,
    redByChapter,
    columnsClassName,
    contentHeightPx,
    studyLayout,
    measureOptions,
  );
  return scriptureContentFitsPage(node, contentHeightPx, columnsClassName);
}

/**
 * Largest stream index for the left page where both panes of a spread fit.
 * Never uses a percentage guess — both sides are measured independently.
 */
function findSpreadLeftPageEnd(
  node: HTMLDivElement,
  stream: ReaderStreamUnit[],
  spreadStart: number,
  spreadEnd: number,
  leftLimit: number,
  rightLimit: number,
  chapters: ReaderChapterPassage[],
  redByChapter: Map<string, Map<number, Segment[]>>,
  columnsClassName: string | undefined,
  studyLayout: ResolvedStudyLayout,
  measureOptions: ScriptureColumnMeasureOptions,
): number {
  if (spreadEnd <= spreadStart + 1) return spreadStart + 1;

  let lo = spreadStart + 1;
  let hi = spreadEnd - 1;
  let best = spreadStart + 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const leftFits = streamSliceFitsPage(
      node,
      stream,
      spreadStart,
      mid,
      chapters,
      redByChapter,
      columnsClassName,
      leftLimit,
      studyLayout,
      measureOptions,
    );
    const rightFits = streamSliceFitsPage(
      node,
      stream,
      mid,
      spreadEnd,
      chapters,
      redByChapter,
      columnsClassName,
      rightLimit,
      studyLayout,
      measureOptions,
    );
    if (leftFits && rightFits) {
      best = mid;
      lo = mid + 1;
    } else if (!leftFits) {
      hi = mid - 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

function findStreamSliceEnd(
  node: HTMLDivElement,
  stream: ReaderStreamUnit[],
  start: number,
  maxEnd: number,
  chapters: ReaderChapterPassage[],
  redByChapter: Map<string, Map<number, Segment[]>>,
  columnsClassName: string | undefined,
  limit: number,
  studyLayout: ResolvedStudyLayout,
  measureOptions?: ScriptureColumnMeasureOptions,
): number {
  if (start >= maxEnd) return start;
  let lastFit = start;
  let n = 1;
  while (start + n <= maxEnd) {
    renderStreamSlice(
      node,
      stream.slice(start, start + n),
      chapters,
      redByChapter,
      columnsClassName,
      limit,
      studyLayout,
      measureOptions,
    );
    if (scriptureContentFitsPage(node, limit, columnsClassName)) {
      lastFit = start + n;
      n *= 2;
    } else {
      break;
    }
  }
  let lo = lastFit + 1;
  let hi = Math.min(start + n, maxEnd);
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    renderStreamSlice(
      node,
      stream.slice(start, mid),
      chapters,
      redByChapter,
      columnsClassName,
      limit,
      studyLayout,
      measureOptions,
    );
    if (scriptureContentFitsPage(node, limit, columnsClassName)) {
      lastFit = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (lastFit === start) lastFit = start + 1;
  return lastFit;
}

function renderStreamSlice(
  node: HTMLDivElement,
  slice: ReaderStreamUnit[],
  chapters: ReaderChapterPassage[],
  redByChapter: Map<string, Map<number, Segment[]>>,
  columnsClassName: string | undefined,
  contentHeightPx: number,
  studyLayout: ResolvedStudyLayout,
  measureOptions?: ScriptureColumnMeasureOptions,
) {
  const scriptureHtml = buildStreamSliceMeasureHtml(
    slice,
    chapters,
    redByChapter,
    studyLayout,
  );
  const footnotesHtml = buildStreamSliceFootnotesMeasureHtml(slice);
  if (studyLayout === "holman" || footnotesHtml) {
    applyHolmanStudyMeasureHtml(
      node,
      scriptureHtml,
      "",
      footnotesHtml,
      columnsClassName,
      contentHeightPx,
      measureOptions,
    );
    return;
  }
  applyScriptureColumnMeasureHtml(
    node,
    scriptureHtml,
    columnsClassName,
    contentHeightPx,
    measureOptions,
  );
}
