import type { ReactNode } from "react";
import { NotebookPen } from "lucide-react";
import type { PassageVerse } from "@/lib/bible/api";
import {
  highlightIntervalsForVerse,
  sliceTextByHighlights,
} from "@/lib/bible/verseSelection";
import { redLetterSegmentsForVerse, type Segment as JesusSegment } from "@/lib/bible/redLetter";
import { shouldShowChapterDropCap } from "@/lib/bible/scriptureParagraph";
import { sliceSegmentsForRange } from "@/lib/bible/verseBodyRender";
import { holmanPartsForVerse } from "@/lib/bible/holmanStudyLayout";
import type { ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";
import { styledTextClass, verseParts, versePlainText, type VersePart } from "@/lib/bible/verseParts";

function markerVariant(book: string, chapter: number, verse: number): number {
  let h = 2166136261;
  const s = `${book}|${chapter}|${verse}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10) + 1;
}

function renderTextRange(
  plain: string,
  text: string,
  rangeStart: number,
  segments: JesusSegment[],
  hlSlices: { text: string; color?: string }[],
  hlGlobalStart: number,
  mv: number,
  style?: "divine" | "inscription" | "selah",
  keyPrefix = "",
): ReactNode[] {
  const rangeEnd = rangeStart + text.length;
  const partSegments = sliceSegmentsForRange(segments, rangeStart, rangeEnd, plain);
  const nodes: ReactNode[] = [];
  let segOffset = rangeStart;

  for (let si = 0; si < partSegments.length; si++) {
    const seg = partSegments[si]!;
    const segStart = segOffset;
    const segEnd = segStart + seg.text.length;
    segOffset = segEnd;

    let hlCursor = hlGlobalStart;
    for (let hi = 0; hi < hlSlices.length; hi++) {
      const hl = hlSlices[hi]!;
      const hlStart = hlCursor;
      const hlEnd = hlStart + hl.text.length;
      hlCursor = hlEnd;

      const oStart = Math.max(segStart, hlStart);
      const oEnd = Math.min(segEnd, hlEnd);
      if (oEnd <= oStart) continue;

      const chunk = plain.slice(oStart, oEnd);
      let inner: ReactNode = chunk;
      if (hl.color) {
        inner = (
          <span
            className={`marker-hl v${mv}`}
            style={{ ["--hl-color" as string]: `var(${hl.color})` }}
          >
            <span className="marker-hl-text">{chunk}</span>
          </span>
        );
      }

      const styled = seg.isJesus ? (
        <span key={`${keyPrefix}-${si}-${hi}`} className="red-letter">
          {inner}
        </span>
      ) : (
        <span key={`${keyPrefix}-${si}-${hi}`}>{inner}</span>
      );
      nodes.push(styled);
    }
  }

  if (nodes.length === 0 && text) {
    const styleClass = styledTextClass(style);
    const inner = styleClass ? <span className={styleClass}>{text}</span> : text;
    nodes.push(<span key={`${keyPrefix}-plain`}>{inner}</span>);
  } else if (style && nodes.length > 0) {
    const styleClass = styledTextClass(style);
    if (styleClass) {
      return [
        <span key={`${keyPrefix}-styled`} className={styleClass}>
          {nodes}
        </span>,
      ];
    }
  }

  return nodes;
}

export interface ReaderVerseRenderDeps {
  bookAbbr: string;
  chapter: number;
  useBookSpread: boolean;
  studyLayout: ResolvedStudyLayout;
  redSegments: Map<number, JesusSegment[]>;
  redSegmentsByChapter: Map<string, Map<number, JesusSegment[]>>;
  ulFor: (n: number, bookAbbr?: string, chapterNum?: number) => { color?: string } | undefined;
  hlsFor: (
    n: number,
    bookAbbr?: string,
    chapterNum?: number,
  ) => { start?: number; end?: number; color: string }[];
  noteFor: (
    n: number,
    bookAbbr?: string,
    chapterNum?: number,
  ) => { verse: number } | undefined;
  onVerseNumberClick: (e: React.MouseEvent, v: { number: number; text: string }) => void;
  navigate: (path: string) => void;
  setNoteOpen: (open: { verse: number }) => void;
}

export function createReaderVerseRenderer({
  bookAbbr,
  chapter,
  useBookSpread,
  studyLayout,
  redSegments,
  redSegmentsByChapter,
  ulFor,
  hlsFor,
  noteFor,
  onVerseNumberClick,
  navigate,
  setNoteOpen,
}: ReaderVerseRenderDeps) {
  return function renderVerse(
    v: PassageVerse,
    ctx?: {
      bookAbbr: string;
      chapter: number;
      paragraphIsContinuation?: boolean;
    },
  ): ReactNode {
    const verseBook = ctx?.bookAbbr ?? bookAbbr;
    const verseChapter = ctx?.chapter ?? chapter;
    const paragraphIsContinuation = ctx?.paragraphIsContinuation ?? false;
    const chapterDropCap = shouldShowChapterDropCap(v.number, paragraphIsContinuation);
    const ul = ulFor(v.number, verseBook, verseChapter);
    const note = noteFor(v.number, verseBook, verseChapter);
    const plain = versePlainText(v);
    const segments = redLetterSegmentsForVerse(
      (useBookSpread
        ? redSegmentsByChapter.get(`${verseBook}|${verseChapter}`)
        : redSegments) ?? new Map<number, JesusSegment[]>(),
      v.number,
      plain,
    );
    const hlMarks = hlsFor(v.number, verseBook, verseChapter);
    const intervals = highlightIntervalsForVerse(plain.length, hlMarks);
    const hlSlices = sliceTextByHighlights(plain, intervals);
    const mv = markerVariant(verseBook, verseChapter, v.number);
    const parts = studyLayout === "holman" ? holmanPartsForVerse(v) : verseParts(v);

    const bodyNodes: ReactNode[] = [];
    const verseXrefs: Extract<VersePart, { kind: "crossref" }>[] = [];
    let charOffset = 0;

    for (let pi = 0; pi < parts.length; pi++) {
      const part = parts[pi]!;
      if (part.kind === "footnote") {
        bodyNodes.push(
          <sup key={`fn-${pi}`} className="scripture-footnote-mark" title={part.text}>
            {part.marker}
          </sup>,
        );
        continue;
      }
      if (part.kind === "image") {
        bodyNodes.push(
          <figure key={`img-${pi}`} className="scripture-inline-image">
            <img src={part.src} alt={part.alt} loading="lazy" className="scripture-inline-image-img" />
            {part.caption ? <figcaption className="scripture-inline-image-caption">{part.caption}</figcaption> : null}
          </figure>,
        );
        continue;
      }
      if (part.kind === "crossref") {
        if (studyLayout === "holman") {
          bodyNodes.push(
            <sup
              key={`xr-${pi}`}
              role="button"
              tabIndex={0}
              className="scripture-holman-mark scripture-holman-mark--xref"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/read/${part.book}/${part.chapter}?v=${part.verse}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/read/${part.book}/${part.chapter}?v=${part.verse}`);
                }
              }}
              title={`Go to ${part.label}`}
            >
              {part.letter ?? "a"}
            </sup>,
          );
        } else {
          verseXrefs.push(part);
        }
        continue;
      }

      bodyNodes.push(
        ...renderTextRange(
          plain,
          part.text,
          charOffset,
          segments,
          hlSlices,
          0,
          mv,
          part.style,
          `p${pi}`,
        ),
      );
      charOffset += part.text.length;
    }

    const bodyStyle: React.CSSProperties = ul
      ? { ["--ink-color" as string]: `var(${ul.color || "--leather"})` }
      : {};
    const wrappedBody = (
      <span
        data-verse-body={v.number}
        className={ul ? "pen-underline" : undefined}
        style={bodyStyle}
      >
        {bodyNodes}
      </span>
    );

    return (
      <span
        key={`${verseBook}-${verseChapter}-${v.number}`}
        data-verse={v.number}
        className={
          chapterDropCap ? "scripture-verse scripture-verse-chapter-open" : "scripture-verse"
        }
      >
        {chapterDropCap ? (
          <span className="chapter-drop-cap" aria-label={`Chapter ${verseChapter}`}>
            {verseChapter}
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => onVerseNumberClick(e, v)}
            className="verse-num verse-num-gutter bg-transparent border-0 p-0 m-0 cursor-pointer hover:text-leather transition-colors"
            aria-label={`Verse ${v.number}`}
            style={{ userSelect: "none" }}
          >
            {v.number}
          </button>
        )}
        <span className="verse-body-wrap">
          {wrappedBody}
          {verseXrefs.length > 0 ? (
            <span className="scripture-verse-xrefs" aria-label="Cross references">
              {verseXrefs.map((xref, xi) => (
                <span
                  key={`vxr-${xi}-${xref.label}`}
                  role="button"
                  tabIndex={0}
                  className="scripture-xref"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/read/${xref.book}/${xref.chapter}?v=${xref.verse}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/read/${xref.book}/${xref.chapter}?v=${xref.verse}`);
                    }
                  }}
                  title={`Go to ${xref.label}`}
                >
                  {xref.label}
                </span>
              ))}
            </span>
          ) : null}
          {note ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (verseBook !== bookAbbr || verseChapter !== chapter) {
                  navigate(`/read/${verseBook}/${verseChapter}?v=${v.number}`);
                  return;
                }
                setNoteOpen({ verse: v.number });
              }}
              className="inline-flex items-center align-middle ml-1 w-4 h-4 rounded-full bg-gold/20 text-gold-deep hover:bg-gold/40 transition-colors"
              aria-label="Open note"
              style={{ userSelect: "none" }}
            >
              <NotebookPen className="w-2.5 h-2.5 m-auto" />
            </button>
          ) : null}
        </span>
      </span>
    );
  };
}
