import { useEffect, useMemo, useRef, useState } from "react";
import type { PassageVerse as Verse } from "@/lib/bible/api";
import { groupVersesIntoParagraphs } from "@/lib/bible/parsePassageHtml";
import { splitJesusSpeechForChapter, type Segment } from "@/lib/bible/redLetter";
import {
  applyScriptureColumnMeasureHtml,
  scriptureContentFitsPage,
} from "@/lib/bible/readerColumnMeasure";
import {
  buildVerseInnerHtml,
  scriptureParagraphClassNameMeasure,
  wrapVerseShellHtml,
} from "@/lib/bible/scriptureParagraph";

interface Props {
  verses: Verse[];
  /** Verse numbers that begin a new paragraph — must match the live reader. */
  paragraphStarts: number[];
  /** Section headings keyed by the first verse they precede. */
  headings?: { beforeVerse: number; text: string }[];
  /** Book abbreviation — used for red-letter detection */
  bookAbbr: string;
  /** Chapter number — used for red-letter detection */
  chapter: number;
  /** Width of one page's text area (px) */
  pageWidth: number;
  /** Height of one page's text area (px) — pages after the first. */
  pageHeight: number;
  /** First page text area (px); smaller when a chapter header sits above the article. */
  firstPageHeight?: number;
  /** Class names matching how the verses will render in real pages (typography) */
  className?: string;
  /** Optional additional class names that wrap the inner column container (e.g. "columns-2 gap-5") */
  columnsClassName?: string;
  /** Footer reserved height per page (chapter nav etc.) */
  footerHeight?: number;
  /** Optional inline style applied to the measurement node so paginator
   * splits stay in sync with the live page when text size changes. */
  fontSizeStyle?: React.CSSProperties;
  /** Called with the verse-index splits: pages[i] = verses[splits[i]..splits[i+1]] */
  onSplitsChange: (splits: number[]) => void;
}

/**
 * Headlessly measures verses to calculate where each page ends.
 * Renders a hidden, page-sized DOM and binary-searches verse boundaries.
 */
export function Paginator({
  verses,
  paragraphStarts,
  headings = [],
  bookAbbr,
  chapter,
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
  const paragraphStartSet = useMemo(() => new Set(paragraphStarts), [paragraphStarts]);
  const headingByVerse = useMemo(() => {
    const m = new Map<number, string>();
    for (const h of headings) m.set(h.beforeVerse, h.text);
    return m;
  }, [headings]);

  // Pre-compute red-letter segmentation across the whole chapter so multi-
  // verse quotes are measured with the same red-text rendering the live
  // page uses.
  const redSegments = useMemo(
    () => splitJesusSpeechForChapter(bookAbbr, chapter, verses),
    [bookAbbr, chapter, verses],
  );

  const resolvedFirstPageHeight = firstPageHeight ?? pageHeight;

  // Serialize array props so parent inline `?? []` fallbacks do not retrigger every render.
  const versesKey = useMemo(
    () => verses.map((v) => `${v.number}:${v.text.length}`).join(","),
    [verses],
  );
  const paragraphStartsKey = paragraphStarts.join(",");
  const headingsKey = useMemo(
    () => headings.map((h) => `${h.beforeVerse}\0${h.text}`).join("\x01"),
    [headings],
  );

  // Recompute when inputs that actually affect measurement change.
  useEffect(() => {
    setRevision((r) => r + 1);
  }, [
    versesKey,
    paragraphStartsKey,
    headingsKey,
    bookAbbr,
    chapter,
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
    if (!ref.current || pageHeight <= 0 || verses.length === 0) {
      const next = [0, verses.length];
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
    let isFirstPage = true;
    while (i < verses.length) {
      const baseHeight = isFirstPage ? resolvedFirstPageHeight : pageHeight;
      const limit = baseHeight - footerHeight;
      // Add verses one at a time until we overflow
      let lastFit = i;
      let lo = i + 1;
      let hi = verses.length;
      // exponential search to find a too-many size, then binary search down
      let n = 1;
      while (i + n <= verses.length) {
        renderInto(
          node,
          verses.slice(i, i + n),
          redSegments,
          paragraphStartSet,
          headingByVerse,
          chapter,
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
      // binary search between lastFit and min(i+n, verses.length)
      lo = lastFit + 1;
      hi = Math.min(i + n, verses.length);
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        renderInto(
          node,
          verses.slice(i, mid),
          redSegments,
          paragraphStartSet,
          headingByVerse,
          chapter,
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
      // Ensure progress
      if (lastFit === i) lastFit = i + 1;
      splits.push(lastFit);
      i = lastFit;
      isFirstPage = false;
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

function renderInto(
  node: HTMLDivElement,
  verses: Verse[],
  redSegments: Map<number, Segment[]>,
  paragraphStarts: Set<number>,
  headingByVerse: Map<number, string>,
  chapter: number,
  columnsClassName: string | undefined,
  contentHeightPx: number,
) {
  const groups = groupVersesIntoParagraphs(verses, paragraphStarts);
  const bodyHtml = groups
    .map((group) => {
      const first = group.verses[0]?.number;
      const heading = first != null ? headingByVerse.get(first) : undefined;
      const headingHtml = heading
        ? `<p class="scripture-heading">${escapeHtml(heading)}</p>`
        : "";
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
            chapter,
            inner,
            group.isContinuation,
          );
        })
        .join("");
      const paraClass = scriptureParagraphClassNameMeasure(group.isContinuation);
      return `${headingHtml}<p class="${paraClass}" style="hyphens:auto;orphans:2;widows:2">${versesHtml}</p>`;
    })
    .join("");
  applyScriptureColumnMeasureHtml(node, bodyHtml, columnsClassName, contentHeightPx);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
