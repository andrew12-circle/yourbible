import type { ReactNode } from "react";
import { NotebookPen } from "lucide-react";
import type { PassageVerse } from "@/lib/bible/api";
import {
  highlightIntervalsForVerse,
  sliceTextByHighlights,
} from "@/lib/bible/verseSelection";
import { redLetterSegmentsForVerse, type Segment as JesusSegment } from "@/lib/bible/redLetter";
import { shouldShowChapterDropCap } from "@/lib/bible/scriptureParagraph";

function markerVariant(book: string, chapter: number, verse: number): number {
  let h = 2166136261;
  const s = `${book}|${chapter}|${verse}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10) + 1;
}

export interface ReaderVerseRenderDeps {
  bookAbbr: string;
  chapter: number;
  useBookSpread: boolean;
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
    const verseText = typeof v.text === "string" ? v.text : "";
    const segments = redLetterSegmentsForVerse(
      (useBookSpread
        ? redSegmentsByChapter.get(`${verseBook}|${verseChapter}`)
        : redSegments) ?? new Map<number, JesusSegment[]>(),
      v.number,
      verseText,
    );
    const hlMarks = hlsFor(v.number, verseBook, verseChapter);
    const intervals = highlightIntervalsForVerse(verseText.length, hlMarks);
    const textParts = sliceTextByHighlights(verseText, intervals);
    const mv = markerVariant(verseBook, verseChapter, v.number);

    const segBounds: { start: number; end: number; seg: JesusSegment }[] = [];
    let acc = 0;
    for (const s of segments) {
      segBounds.push({ start: acc, end: acc + s.text.length, seg: s });
      acc += s.text.length;
    }

    const bodyNodes: ReactNode[] = [];
    let global = 0;
    for (let pi = 0; pi < textParts.length; pi++) {
      const part = textParts[pi];
      const pStart = global;
      const pEnd = global + part.text.length;
      global = pEnd;
      for (let si = 0; si < segBounds.length; si++) {
        const { start: sStart, end: sEnd, seg } = segBounds[si];
        const oStart = Math.max(pStart, sStart);
        const oEnd = Math.min(pEnd, sEnd);
        if (oEnd <= oStart) continue;
        const chunk = verseText.slice(oStart, oEnd);
        let inner: ReactNode = chunk;
        if (part.color) {
          inner = (
            <span
              className={`marker-hl v${mv}`}
              style={{ ["--hl-color" as string]: `var(${part.color})` }}
            >
              <span className="marker-hl-text">{chunk}</span>
            </span>
          );
        }
        bodyNodes.push(
          seg.isJesus ? (
            <span key={`${pi}-${si}`} className="red-letter">
              {inner}
            </span>
          ) : (
            <span key={`${pi}-${si}`}>{inner}</span>
          ),
        );
      }
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
          {v.crossRefs?.map((ref, ri) => (
            <button
              key={`xr-${verseBook}-${verseChapter}-${v.number}-${ri}`}
              type="button"
              className="scripture-xref"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/read/${ref.book}/${ref.chapter}?v=${ref.verse}`);
              }}
              title={`Go to ${ref.label}`}
            >
              {ref.label}
            </button>
          ))}
          {v.footnotes?.map((fn) => (
            <span
              key={`fn-${verseBook}-${verseChapter}-${v.number}-${fn.marker}`}
              className="scripture-footnote"
              title={fn.text}
            >
              [{fn.marker}]
            </span>
          ))}
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
