import { useEffect, useMemo, useRef, useState } from "react";
import { groupVersesIntoParagraphs } from "@/lib/bible/parsePassageHtml";
import { splitJesusSpeechForChapter, type Segment } from "@/lib/bible/redLetter";
import {
  buildVerseInnerHtml,
  scriptureParagraphClassNameMeasure,
  wrapVerseShellHtml,
} from "@/lib/bible/scriptureParagraph";
import {
  applyScriptureColumnMeasureHtml,
  scriptureContentFitsPage,
} from "@/lib/bible/readerColumnMeasure";
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
    fontSizeStyle?.fontSize,
    fontSizeStyle?.fontFamily,
  ]);

  useEffect(() => {
    if (!ref.current || pageHeight <= 0 || stream.length === 0) {
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
    while (i < stream.length) {
      if (stream[i]?.kind === "plate") {
        splits.push(i + 1);
        i += 1;
        pageIndex += 1;
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
      let lastFit = i;
      let n = 1;
      while (i + n <= stream.length) {
        renderStreamSlice(
          node,
          stream.slice(i, i + n),
          chapters,
          redByChapter,
          columnsClassName,
          limit,
        );
        if (scriptureContentFitsPage(node, limit, columnsClassName)) {
          lastFit = i + n;
          n *= 2;
        } else {
          break;
        }
      }
      let lo = lastFit + 1;
      let hi = Math.min(i + n, stream.length);
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        renderStreamSlice(
          node,
          stream.slice(i, mid),
          chapters,
          redByChapter,
          columnsClassName,
          limit,
        );
        if (scriptureContentFitsPage(node, limit, columnsClassName)) {
          lastFit = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      if (lastFit === i) lastFit = i + 1;
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
        width: pageWidth,
        visibility: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        ref={ref}
        data-reading-area
        className={className}
        style={{ width: pageWidth, ...fontSizeStyle }}
      />
    </div>
  );
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
  applyScriptureColumnMeasureHtml(node, bodyHtml, columnsClassName, contentHeightPx);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/`/g, "&#96;");
}
