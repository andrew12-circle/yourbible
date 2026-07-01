import type { ReactNode } from "react";
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
  pageStartsWithChapterHeader: boolean;
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
    inlineChapterPlates,
    renderVerse,
    activeStudyLayout,
    pageStartsWithChapterHeader,
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
      (v, ctx) =>
        renderVerse(v, {
          ...ctx,
          showChapterDropCap:
            useStreamReader && !scrollMode ? pageStartsWithChapterHeader : undefined,
        }),
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
      <>
        {inlineChapterPlates
          .filter((p) => p.beforeVerse === 1)
          .map((plate) => (
            <ScripturePlate key={plate.id} plate={plate} compact />
          ))}
        {scriptureNodes(
          streamChapters.map((ch) => ({
            bookAbbr: ch.bookAbbr,
            chapter: ch.chapter,
            verses: ch.verses,
          })),
          (bookAbbr, ch) =>
            new Set(paragraphStartsForChapter(streamChapters, bookAbbr, ch)),
          (bookAbbr, ch) =>
            new Map(
              headingsForChapter(streamChapters, bookAbbr, ch).map((h) => [
                h.beforeVerse,
                h.text,
              ]),
            ),
          (bookAbbr, ch) => poetryBlocksForChapter(streamChapters, bookAbbr, ch),
        )}
      </>
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
      streamSlice.plates.map((plate) => (
        <ScripturePlate key={plate.id} plate={plate} />
      ))
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
