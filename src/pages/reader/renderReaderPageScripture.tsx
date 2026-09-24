import { useState, type ReactNode } from "react";
import { renderReaderScrollStream } from "./renderReaderScrollStream";
import { ScripturePlate } from "@/components/bible/ScripturePlate";
import { ScriptureVirtualChapter, ScriptureDocumentBlocks } from "@/components/scripture";
import type { PassageVerse, PoetryBlock } from "@/lib/bible/api";
import type { BiblePlate } from "@/lib/bible/biblePlates";
import type { ReaderChapterPassage } from "@/lib/bible/readerStream";
import type { ReaderPageSlice } from "@/lib/bible/readerStream";
import type { HolmanVerseGroup } from "@/lib/bible/readerScriptureRender";
import {
  wrapScriptureColumns,
  wrapHolmanStudyContent,
  HolmanPageFootnotes,
  renderScriptureParagraphNodes,
} from "@/lib/bible/readerScriptureRender";
import {
  headingsForChapter,
  paragraphStartsForChapter,
  poetryBlocksForChapter,
} from "@/lib/bible/readerStream";
import type { ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";
import type { ReaderColumnLayout } from "@/lib/bible/readerColumnMeasure";

/** One full-height illustration at a time, even when a text page spans several scenes. */
function ReaderPageArtwork({ plates }: { plates: BiblePlate[] }) {
  const [index, setIndex] = useState(0);
  const plate = plates[index] ?? plates[0];
  if (!plate) return null;
  return <div className="relative h-full min-h-0" data-reader-artwork-group>
    <ScripturePlate plate={plate} />
    {plates.length > 1 ? <nav aria-label="Scenes on this Scripture page" className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full border bg-background/95 px-1 shadow-sm">
      <button type="button" aria-label="Previous scene on this page" className="h-11 w-9" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setIndex(current => (current - 1 + plates.length) % plates.length); }}>‹</button>
      <span className="text-xs tabular-nums">{index + 1}/{plates.length}</span>
      <button type="button" aria-label="Next scene on this page" className="h-11 w-9" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setIndex(current => (current + 1) % plates.length); }}>›</button>
    </nav> : null}
  </div>;
}

type VerseCtx = {
  bookAbbr: string;
  chapter: number;
  paragraphIsContinuation?: boolean;
  showChapterDropCap?: boolean;
};

type ScriptureNodeGroups = { bookAbbr: string; chapter: number; verses: PassageVerse[] }[];

type NodeFactory = (
  groups: ScriptureNodeGroups,
  resolveParagraphStarts: (bookAbbr: string, chapter: number) => Set<number>,
  resolveHeading: (bookAbbr: string, chapter: number) => Map<number, string>,
  resolvePoetryBlocks?: (bookAbbr: string, chapter: number) => PoetryBlock[],
) => ReactNode;

export type ReaderPageScriptureArgs = {
  scrollMode: boolean;
  useStreamReader: boolean;
  streamChapters: ReaderChapterPassage[];
  scrollDocumentBlocks: ScriptureDocumentBlockList;
  verses: PassageVerse[];
  slice: PassageVerse[] | null;
  book: { abbr: string; name: string };
  chapter: number;
  paragraphStarts: Set<number>;
  headingByVerse: Map<number, string>;
  passagePoetryBlocks: PoetryBlock[];
  streamSlice: ReaderPageSlice | null;
  pageContentReady: boolean;
  inlineChapterPlates: BiblePlate[];
  renderVerse: (v: PassageVerse, ctx: VerseCtx) => ReactNode;
  activeStudyLayout: ResolvedStudyLayout;
  useStudyPageStack: boolean;
  spreadColumnLayout: ReaderColumnLayout;
  holmanVerseGroups: HolmanVerseGroup[];
  showPageFootnotes: boolean;
  holmanFootnoteVerses: PassageVerse[];
  showHolmanConnections: boolean;
  stackContentHeightPx: number | undefined;
  scriptureColumnHeightPx: number | undefined;
  holmanNavigateRef?: (book: string, chapter: number, verse: number) => void;
};

type ScriptureDocumentBlockList = Parameters<
  typeof ScriptureVirtualChapter
>[0]["blocks"];

export function renderReaderPageScripture(args: ReaderPageScriptureArgs): ReactNode {
  const {
    scrollMode,
    useStreamReader,
    streamChapters,
    scrollDocumentBlocks,
    verses,
    slice,
    book,
    chapter,
    paragraphStarts,
    headingByVerse,
    passagePoetryBlocks,
    streamSlice,
    pageContentReady,
    renderVerse,
    activeStudyLayout,
    useStudyPageStack,
    spreadColumnLayout,
    holmanVerseGroups,
    showPageFootnotes,
    holmanFootnoteVerses,
    showHolmanConnections,
    stackContentHeightPx,
    scriptureColumnHeightPx,
    holmanNavigateRef,
  } = args;

  const scriptureNodes: NodeFactory = (
    groups,
    resolveParagraphStarts,
    resolveHeading,
    resolvePoetryBlocks,
  ) =>
    renderScriptureParagraphNodes(
      groups,
      resolveParagraphStarts,
      resolveHeading,
      renderVerse,
      resolvePoetryBlocks,
      { studyLayout: activeStudyLayout },
    );

  const pageScriptureNodes: NodeFactory = (
    groups,
    resolveParagraphStarts,
    resolveHeading,
    resolvePoetryBlocks,
  ) =>
    renderScriptureParagraphNodes(
      groups,
      resolveParagraphStarts,
      resolveHeading,
      renderVerse,
      resolvePoetryBlocks,
      { studyLayout: activeStudyLayout },
    );

  const headingsFromVerseOnPage = (bookAbbr: string, ch: number) => {
    const firstVerse =
      streamSlice?.verseGroups.find((g) => g.bookAbbr === bookAbbr && g.chapter === ch)
        ?.verses[0]?.number ?? 1;
    return new Map(
      headingsForChapter(streamChapters, bookAbbr, ch)
        .filter((h) => h.beforeVerse >= firstVerse)
        .map((h) => [h.beforeVerse, h.text]),
    );
  };

  const scriptureContent: ReactNode =
    scrollMode && useStreamReader && streamChapters.length > 0 ? (
      renderReaderScrollStream(
        streamChapters.filter((ch) => ch.bookAbbr === book.abbr && ch.chapter === chapter),
        scriptureNodes,
      )
    ) : scrollMode && scrollDocumentBlocks.length > 0 ? (
      <ScriptureVirtualChapter
        blocks={scrollDocumentBlocks}
        className="h-full min-h-0"
        renderBlock={(block) => (
          <ScriptureDocumentBlocks
            blocks={[block]}
            renderVerse={(v, ctx) =>
              renderVerse(
                {
                  number: v.number,
                  text: v.text,
                  parts: v.parts,
                  crossRefs: v.crossRefs,
                  footnotes: v.footnotes,
                },
                ctx,
              )
            }
          />
        )}
      />
    ) : scrollMode && verses.length > 0 ? (
      scriptureNodes(
        [{ bookAbbr: book.abbr, chapter, verses }],
        () => paragraphStarts,
        () => headingByVerse,
        () => passagePoetryBlocks,
      )
    ) : streamSlice?.isPlatePage && pageContentReady ? (
      <ReaderPageArtwork key={streamSlice.plates.map(plate => plate.id).join("|")} plates={streamSlice.plates} />
    ) : useStreamReader && streamSlice && pageContentReady ? (
      <>
        {streamSlice.plates.map((plate) => (
          <ScripturePlate key={plate.id} plate={plate} compact />
        ))}
        {pageScriptureNodes(
          streamSlice.verseGroups.map((verseGroup) => ({
            bookAbbr: verseGroup.bookAbbr,
            chapter: verseGroup.chapter,
            verses: verseGroup.verses,
          })),
          (bookAbbr, ch) =>
            new Set(paragraphStartsForChapter(streamChapters, bookAbbr, ch)),
          headingsFromVerseOnPage,
          (bookAbbr, ch) => poetryBlocksForChapter(streamChapters, bookAbbr, ch),
        )}
      </>
    ) : slice && slice.length > 0 ? (
      scriptureNodes(
        [{ bookAbbr: book.abbr, chapter, verses: slice }],
        () => paragraphStarts,
        () => headingByVerse,
        () => passagePoetryBlocks,
      )
    ) : null;

  // An illustration occupies its own page, never a Scripture column or footnote stack.
  if (!scrollMode && streamSlice?.isPlatePage && pageContentReady) return scriptureContent;

  if (useStudyPageStack) {
    return wrapHolmanStudyContent(
      spreadColumnLayout,
      scrollMode,
      scriptureContent,
      holmanVerseGroups,
      showPageFootnotes ? <HolmanPageFootnotes verses={holmanFootnoteVerses} /> : null,
      showHolmanConnections,
      scrollMode ? undefined : stackContentHeightPx,
      holmanNavigateRef,
    );
  }

  return wrapScriptureColumns(
    spreadColumnLayout,
    scrollMode,
    scriptureContent,
    scriptureColumnHeightPx,
  );
}
