import { useEffect, useRef, useState } from "react";
import type { PassageVerse as Verse } from "@/lib/bible/api";
import { splitJesusSpeechHtml } from "@/lib/bible/redLetter";

interface Props {
  verses: Verse[];
  /** Book abbreviation — used for red-letter detection */
  bookAbbr: string;
  /** Chapter number — used for red-letter detection */
  chapter: number;
  /** Width of one page's text area (px) */
  pageWidth: number;
  /** Height of one page's text area (px) */
  pageHeight: number;
  /** Class names matching how the verses will render in real pages (typography) */
  className?: string;
  /** Optional additional class names that wrap the inner column container (e.g. "columns-2 gap-5") */
  columnsClassName?: string;
  /** Optional header (rendered only on the first page) — measured */
  header?: React.ReactNode;
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
  bookAbbr,
  chapter,
  pageWidth,
  pageHeight,
  className,
  columnsClassName,
  header,
  footerHeight = 0,
  fontSizeStyle,
  onSplitsChange,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(0);
  const lastSplitsRef = useRef<string>("");

  // Recompute when inputs that actually affect measurement change.
  // NOTE: `header` is intentionally excluded — it's a JSX element rebuilt
  // every parent render, and `renderInto` uses its own static header stub
  // for measurement. Including it caused an infinite re-pagination loop.
  useEffect(() => {
    setRevision(r => r + 1);
  }, [verses, bookAbbr, chapter, pageWidth, pageHeight, footerHeight, className, columnsClassName, fontSizeStyle?.fontSize]);

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
      const limit = pageHeight - (isFirstPage ? 0 : footerHeight);
      // Add verses one at a time until we overflow
      let lastFit = i;
      let lo = i + 1;
      let hi = verses.length;
      // exponential search to find a too-many size, then binary search down
      let n = 1;
      while (i + n <= verses.length) {
        renderInto(node, verses.slice(i, i + n), bookAbbr, chapter, isFirstPage ? header : undefined, columnsClassName);
        if (node.scrollHeight <= limit) {
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
        renderInto(node, verses.slice(i, mid), bookAbbr, chapter, isFirstPage ? header : undefined, columnsClassName);
        if (node.scrollHeight <= limit) {
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
      <div ref={ref} className={className} style={{ width: pageWidth, ...fontSizeStyle }} />
    </div>
  );
}

function renderInto(node: HTMLDivElement, verses: Verse[], bookAbbr: string, chapter: number, header?: React.ReactNode, columnsClassName?: string) {
  // Build inline HTML to mimic our reader output without React reconciliation cost
  const headerHtml = header ? renderHeaderHtml() : "";
  const versesHtml = verses
    .map(v => `<span><span class="verse-num">${v.number}</span>${splitJesusSpeechHtml(bookAbbr, chapter, v.number, v.text, escapeHtml)} </span>`)
    .join("");
  const inner = `${headerHtml}<p style="text-align:justify;hyphens:auto;orphans:2;widows:2">${versesHtml}</p>`;
  node.innerHTML = columnsClassName
    ? `<div class="${columnsClassName}">${inner}</div>`
    : inner;
}

function renderHeaderHtml() {
  // Approx height of book title + chapter rule we use in the real page
  return `<div style="text-align:center;margin-bottom:1.5rem">
    <div style="font-family:'Playfair Display',serif;font-size:1.875rem;line-height:1;margin-bottom:.25rem">&nbsp;</div>
    <div style="font-size:.6875rem;letter-spacing:.3em;text-transform:uppercase">CHAPTER X</div>
  </div>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
