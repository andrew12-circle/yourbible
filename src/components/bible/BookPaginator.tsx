import { useEffect, useMemo, useRef, useState } from "react";
import { groupVersesIntoParagraphs } from "@/lib/bible/parsePassageHtml";
import { splitJesusSpeechForChapter, type Segment } from "@/lib/bible/redLetter";
import {
  buildVerseInnerHtml,
  scriptureParagraphClassNameMeasure,
  wrapVerseShellHtml,
} from "@/lib/bible/scriptureParagraph";
import {
  SPREAD_MEASURE_GAP_PX,
  applyScriptureColumnMeasureHtml,
  scriptureContentFitsPage,
  type ScriptureColumnMeasureOptions,
} from "@/lib/bible/readerColumnMeasure";
import { READER_SPREAD_COLUMNS_CLASS } from "@/lib/bible/readerColumnLayout";
import {
  CHAPTER_HEADER_RESERVE_PX,
  type ReaderChapterPassage,
  type ReaderStreamUnit,
  buildReaderStream,
  paragraphStartsForChapter,
  headingsForChapter,
} from "@/lib/bible/readerStream";
import type { PassageVerse } from "@/lib/bible/api";

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
  onSplitsChange,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
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
    fontSizeStyle?.fontSize,
    fontSizeStyle?.fontFamily,
  ]);

  useEffect(() => {
    if (!ref.current || pageHeight <= 0 || stream.length === 0) {
      const useSpreadColumns = Boolean(spreadMode && columnsClassName);
      const next =
        useSpreadColumns && stream.length > 2
          ? [0, Math.max(1, Math.floor(stream.length / 2)), stream.length]
          : [0, stream.length];
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
    const spreadMeasureWidth = pageWidth * 2 + SPREAD_MEASURE_GAP_PX;

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
        const leftLimit = pageContentLimit(
          pageIndex,
          spreadStartsWithHeader,
          resolvedFirstPageHeight,
          pageHeight,
          footerHeight,
        );
        const spreadLimit = spreadStartsWithHeader
          ? leftLimit
          : pageHeight - footerHeight;
        const spreadEnd = findStreamSliceEnd(
          node,
          stream,
          spreadStart,
          stream.length,
          chapters,
          redByChapter,
          READER_SPREAD_COLUMNS_CLASS,
          spreadLimit,
          { columnCount: 4, measureWidthPx: spreadMeasureWidth },
        );
        const leftEnd = findStreamSliceEnd(
          node,
          stream,
          spreadStart,
          spreadEnd,
          chapters,
          redByChapter,
          columnsClassName,
          leftLimit,
          { columnCount: 2, measureWidthPx: pageWidth },
        );
        if (leftEnd === spreadStart) {
          splits.push(spreadStart + 1);
          i = spreadStart + 1;
          pageIndex += 1;
          continue;
        }
        splits.push(leftEnd);
        if (leftEnd < spreadEnd) {
          splits.push(spreadEnd);
        }
        i = spreadEnd;
        pageIndex += leftEnd < spreadEnd ? 2 : 1;
        continue;
      }

      const startsWithHeader = stream[i]?.kind === "chapter-header";
      const limit = pageContentLimit(
        pageIndex,
        startsWithHeader,
        resolvedFirstPageHeight,
        pageHeight,
        footerHeight,
      );
      const lastFit = findStreamSliceEnd(
        node,
        stream,
        i,
        stream.length,
        chapters,
        redByChapter,
        columnsClassName,
        limit,
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
        width: spreadMode && columnsClassName ? pageWidth * 2 + SPREAD_MEASURE_GAP_PX : pageWidth,
        visibility: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        ref={ref}
        data-reading-area
        className={className}
        style={{
          width: spreadMode && columnsClassName ? pageWidth * 2 + SPREAD_MEASURE_GAP_PX : pageWidth,
          ...fontSizeStyle,
        }}
      />
    </div>
  );
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

function pageContentLimit(
  pageIndex: number,
  startsWithHeader: boolean,
  firstPageHeight: number,
  pageHeight: number,
  footerHeight: number,
): number {
  if (pageIndex === 0 && startsWithHeader) {
    return firstPageHeight - footerHeight;
  }
  if (startsWithHeader) {
    return pageHeight - CHAPTER_HEADER_RESERVE_PX - footerHeight;
  }
  return pageHeight - footerHeight;
}

function renderStreamSlice(
  node: HTMLDivElement,
  slice: ReaderStreamUnit[],
  chapters: ReaderChapterPassage[],
  redByChapter: Map<string, Map<number, Segment[]>>,
  columnsClassName: string | undefined,
  contentHeightPx: number,
  measureOptions?: ScriptureColumnMeasureOptions,
) {
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
    const redSegments =
      redByChapter.get(`${batch.bookAbbr}|${batch.chapter}`) ??
      new Map<number, Segment[]>();
    const groups = groupVersesIntoParagraphs(batch.verses, paragraphStarts);
    for (const group of groups) {
      const first = group.verses[0]?.number;
      const heading = first != null ? headingByVerse.get(first) : undefined;
      if (heading) {
        parts.push(`<p class="scripture-heading">${escapeHtml(heading)}</p>`);
      }
      const versesHtml = group.verses
        .map((v) => {
          const inner = buildVerseInnerHtml(
            v.number,
            v.text ?? "",
            redSegments,
            escapeHtml,
          );
          return wrapVerseShellHtml(
            v.number,
            batch!.chapter,
            inner,
            group.isContinuation,
          );
        })
        .join("");
      const paraClass = scriptureParagraphClassNameMeasure(group.isContinuation);
      parts.push(
        `<p class="${paraClass}" style="hyphens:auto;orphans:2;widows:2">${versesHtml}</p>`,
      );
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

  const bodyHtml = parts.join("");
  applyScriptureColumnMeasureHtml(
    node,
    bodyHtml,
    columnsClassName,
    contentHeightPx,
    measureOptions,
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/`/g, "&#96;");
}
