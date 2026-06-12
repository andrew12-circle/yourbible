import { useMemo, type ReactNode } from "react";

import { SpreadScriptureOverlay } from "@/components/bible/SpreadScriptureOverlay";

import { ScripturePlate } from "@/components/bible/ScripturePlate";

import type { PassageVerse } from "@/lib/bible/api";

import { groupVersesIntoParagraphs } from "@/lib/bible/parsePassageHtml";

import { scriptureParagraphClassName } from "@/lib/bible/scriptureParagraph";

import {

  headingsForChapter,

  paragraphStartsForChapter,

  sliceReaderStreamRange,

  spreadPaneStreamRanges,

  type ReaderChapterPassage,

  type ReaderStreamUnit,

} from "@/lib/bible/readerStream";

import {

  readerScriptureTypographyStyle,

  type FontChoiceId,

} from "@/lib/bible/fontChoices";



interface VerseRenderContext {

  bookAbbr: string;

  chapter: number;

  paragraphIsContinuation?: boolean;

}



interface Props {

  enabled: boolean;

  readerStream: ReaderStreamUnit[];

  displayStreamSplits: number[];

  spreadPageIdx: number;

  streamChapters: ReaderChapterPassage[];

  passageVerses: PassageVerse[];

  bookAbbr: string;

  bookName: string;

  chapter: number;

  paragraphStarts: Set<number>;

  headingByVerse: Map<number, string>;

  renderVerse: (v: PassageVerse, ctx: VerseRenderContext) => ReactNode;

  scriptureTypoClass: string;

  scriptureFont: string;

  fontChoice: FontChoiceId;

  fontScale: number;

  readerSpread: boolean;

  pageStackLeftPx?: number;

  pageStackRightPx?: number;

  columnHeightPx?: number;

  loadingPassage: boolean;

}



function renderPaneNodes(

  slice: ReturnType<typeof sliceReaderStreamRange>,

  streamChapters: ReaderChapterPassage[],

  renderVerse: Props["renderVerse"],

): ReactNode {

  if (!slice) return null;

  if (slice.isPlatePage) {

    return slice.plates.map((plate) => <ScripturePlate key={plate.id} plate={plate} />);

  }

  if (slice.verseGroups.length === 0) return null;

  return slice.verseGroups.flatMap((verseGroup) => {

    const paragraphStartSet = new Set(

      paragraphStartsForChapter(streamChapters, verseGroup.bookAbbr, verseGroup.chapter),

    );

    const headingMap = new Map(

      headingsForChapter(streamChapters, verseGroup.bookAbbr, verseGroup.chapter).map((h) => [

        h.beforeVerse,

        h.text,

      ]),

    );

    return groupVersesIntoParagraphs(verseGroup.verses, paragraphStartSet).flatMap((group) => {

      const nodes: ReactNode[] = [];

      const first = group.verses[0]?.number;

      const heading = first != null ? headingMap.get(first) : undefined;

      if (heading) {

        nodes.push(

          <p key={`h-${verseGroup.bookAbbr}-${verseGroup.chapter}-${first}`} className="scripture-heading">

            {heading}

          </p>,

        );

      }

      nodes.push(

        <p

          key={`p-${verseGroup.bookAbbr}-${verseGroup.chapter}-${first}`}

          className={scriptureParagraphClassName(group.isContinuation)}

          style={{ orphans: 2, widows: 2 }}

        >

          {group.verses.map((v) =>

            renderVerse(v, {

              bookAbbr: verseGroup.bookAbbr,

              chapter: verseGroup.chapter,

              paragraphIsContinuation: group.isContinuation,

            }),

          )}

        </p>,

      );

      return nodes;

    });

  });

}



function renderFallbackVerses(

  bookAbbr: string,

  chapter: number,

  verses: PassageVerse[],

  paragraphStarts: Set<number>,

  headingByVerse: Map<number, string>,

  renderVerse: Props["renderVerse"],

): ReactNode {

  if (verses.length === 0) return null;

  return groupVersesIntoParagraphs(verses, paragraphStarts).flatMap((group) => {

    const nodes: ReactNode[] = [];

    const first = group.verses[0]?.number;

    const heading = first != null ? headingByVerse.get(first) : undefined;

    if (heading) {

      nodes.push(

        <p key={`h-${bookAbbr}-${chapter}-${first}`} className="scripture-heading">

          {heading}

        </p>,

      );

    }

    nodes.push(

      <p

        key={`p-${bookAbbr}-${chapter}-${first}`}

        className={scriptureParagraphClassName(group.isContinuation)}

        style={{ orphans: 2, widows: 2 }}

      >

        {group.verses.map((v) =>

          renderVerse(v, {

            bookAbbr,

            chapter,

            paragraphIsContinuation: group.isContinuation,

          }),

        )}

      </p>,

    );

    return nodes;

  });

}



function splitPassageVerses(verses: PassageVerse[]): { left: PassageVerse[]; right: PassageVerse[] } {

  if (verses.length <= 1) return { left: verses, right: [] };

  const mid = Math.max(1, Math.floor(verses.length * 0.48));

  return { left: verses.slice(0, mid), right: verses.slice(mid) };

}



export function useSpreadScriptureOverlay({

  enabled,

  readerStream,

  displayStreamSplits,

  spreadPageIdx,

  streamChapters,

  passageVerses,

  bookAbbr,

  bookName,

  chapter,

  paragraphStarts,

  headingByVerse,

  renderVerse,

  scriptureTypoClass,

  scriptureFont,

  fontChoice,

  fontScale,

  readerSpread,

  pageStackLeftPx = 0,

  pageStackRightPx = 0,

  columnHeightPx,

  loadingPassage,

}: Props): ReactNode | null {

  const paneRanges = useMemo(

    () => spreadPaneStreamRanges(displayStreamSplits, spreadPageIdx, readerStream.length),

    [displayStreamSplits, spreadPageIdx, readerStream.length],

  );



  const leftSpreadSlice = useMemo(() => {

    if (!enabled || readerStream.length === 0) return null;

    return sliceReaderStreamRange(

      readerStream,

      paneRanges.left.start,

      paneRanges.left.end,

      spreadPageIdx,

    );

  }, [enabled, readerStream, paneRanges.left.start, paneRanges.left.end, spreadPageIdx]);



  const rightSpreadSlice = useMemo(() => {

    if (!enabled || readerStream.length === 0) return null;

    return sliceReaderStreamRange(

      readerStream,

      paneRanges.right.start,

      paneRanges.right.end,

      spreadPageIdx + 1,

    );

  }, [enabled, readerStream, paneRanges.right.start, paneRanges.right.end, spreadPageIdx]);



  const spreadLeftContent = useMemo(() => {

    const fromSlice = renderPaneNodes(leftSpreadSlice, streamChapters, renderVerse);

    if (fromSlice) return fromSlice;

    if (passageVerses.length > 0) {

      const { left } = splitPassageVerses(passageVerses);

      return renderFallbackVerses(

        bookAbbr,

        chapter,

        left,

        paragraphStarts,

        headingByVerse,

        renderVerse,

      );

    }

    return null;

  }, [

    leftSpreadSlice,

    streamChapters,

    renderVerse,

    passageVerses,

    bookAbbr,

    chapter,

    paragraphStarts,

    headingByVerse,

  ]);



  const spreadRightContent = useMemo(() => {

    const fromSlice = renderPaneNodes(rightSpreadSlice, streamChapters, renderVerse);

    if (fromSlice) return fromSlice;

    if (passageVerses.length > 1) {

      const { right } = splitPassageVerses(passageVerses);

      return renderFallbackVerses(

        bookAbbr,

        chapter,

        right,

        paragraphStarts,

        headingByVerse,

        renderVerse,

      );

    }

    return null;

  }, [

    rightSpreadSlice,

    streamChapters,

    renderVerse,

    passageVerses,

    bookAbbr,

    chapter,

    paragraphStarts,

    headingByVerse,

  ]);



  if (!enabled) return null;



  const busy = loadingPassage && !spreadLeftContent && !spreadRightContent;



  return (

    <SpreadScriptureOverlay

      columnHeightPx={columnHeightPx}

      pageStackLeftPx={pageStackLeftPx}

      pageStackRightPx={pageStackRightPx}

      className={scriptureTypoClass}

      typographyStyle={{

        ...readerScriptureTypographyStyle(fontChoice, fontScale, { desktopSpread: readerSpread }),

        fontFamily: scriptureFont,

        ["--reader-scripture-font-family" as string]: scriptureFont,

      }}

      busy={busy}

      leftContent={spreadLeftContent}

      rightContent={spreadRightContent}

    />

  );

}


