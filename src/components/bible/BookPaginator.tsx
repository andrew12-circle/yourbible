import { useEffect, useMemo, useRef, useState } from "react";
import { groupVersesIntoParagraphs } from "@/lib/bible/parsePassageHtml";
import { splitJesusSpeechForChapter, redLetterSegmentsForVerse, type Segment } from "@/lib/bible/redLetter";
import {
  CHAPTER_HEADER_RESERVE_PX,
  type ReaderChapterPassage,
  type ReaderStreamUnit,
  buildReaderStream,
  paragraphStartsForChapter,
  headingsForChapter,
} from "@/lib/bible/readerStream";

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
        );
        if (node.scrollHeight <= limit) {
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
        );
        if (node.scrollHeight <= limit) {
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
  columnsClassName?: string,
) {
  const parts: string[] = [];
  for (const unit of slice) {
    if (unit.kind === "chapter-header") {
      continue;
    }
    const paragraphStarts = new Set(
      paragraphStartsForChapter(chapters, unit.bookAbbr, unit.chapter),
    );
    const headingByVerse = new Map<number, string>();
    for (const h of headingsForChapter(chapters, unit.bookAbbr, unit.chapter)) {
      headingByVerse.set(h.beforeVerse, h.text);
    }
    const redSegments =
      redByChapter.get(`${unit.bookAbbr}|${unit.chapter}`) ??
      new Map<number, Segment[]>();
    const groups = groupVersesIntoParagraphs([unit.verse], paragraphStarts);
    for (const group of groups) {
      const first = group.verses[0]?.number;
      const heading = first != null ? headingByVerse.get(first) : undefined;
      if (heading) {
        parts.push(`<p class="scripture-heading">${escapeHtml(heading)}</p>`);
      }
      const versesHtml = group.verses
        .map((v) => {
          const segs = redLetterSegmentsForVerse(redSegments, v.number, v.text ?? "");
          const inner = segs
            .map((s) =>
              s.isJesus
                ? `<span class="red-letter">${escapeHtml(s.text)}</span>`
                : escapeHtml(s.text),
            )
            .join("");
          return `<span><span class="verse-num">${v.number}</span>${inner} </span>`;
        })
        .join("");
      const paraClass = group.isContinuation
        ? "scripture-paragraph scripture-paragraph-continue text-justify"
        : "scripture-paragraph text-justify";
      parts.push(
        `<p class="${paraClass}" style="hyphens:auto;orphans:2;widows:2">${versesHtml}</p>`,
      );
    }
  }
  const bodyHtml = parts.join("");
  node.innerHTML = columnsClassName
    ? `<div class="${columnsClassName}">${bodyHtml}</div>`
    : bodyHtml;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
