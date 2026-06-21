import type { ReactNode } from "react";
import type { PassageVerse, PoetryBlock } from "@/lib/bible/api";
import {
  groupVersesIntoParagraphs,
  poetryLevelForVerse,
} from "@/lib/bible/parsePassageHtml";
import {
  readerColumnClassName,
  type ReaderColumnLayout,
} from "@/lib/bible/readerColumnLayout";
import { scriptureColumnWrapperStyle } from "@/lib/bible/readerColumnMeasure";
import {
  scriptureParagraphClassName,
  scripturePoetryClassName,
} from "@/lib/bible/scriptureParagraph";
import { cn } from "@/lib/utils";

export function wrapScriptureColumns(
  layout: ReaderColumnLayout,
  scrollMode: boolean,
  children: ReactNode,
  contentHeightPx?: number,
): ReactNode {
  const columnsClass = readerColumnClassName(layout);
  if (!columnsClass) return children;
  return (
    <div
      className={cn(columnsClass, !scrollMode && "h-full w-full min-h-0")}
      style={scrollMode ? undefined : scriptureColumnWrapperStyle(contentHeightPx)}
    >
      {children}
    </div>
  );
}

export function renderScriptureParagraphNodes(
  groups: { bookAbbr: string; chapter: number; verses: PassageVerse[] }[],
  resolveParagraphStarts: (bookAbbr: string, chapter: number) => Set<number>,
  resolveHeading: (bookAbbr: string, chapter: number) => Map<number, string>,
  renderVerse: (
    v: PassageVerse,
    ctx: { bookAbbr: string; chapter: number; paragraphIsContinuation?: boolean },
  ) => ReactNode,
  resolvePoetryBlocks?: (bookAbbr: string, chapter: number) => PoetryBlock[],
): ReactNode {
  return groups.flatMap((verseGroup) => {
    const paragraphStartSet = resolveParagraphStarts(verseGroup.bookAbbr, verseGroup.chapter);
    const headingMap = resolveHeading(verseGroup.bookAbbr, verseGroup.chapter);
    const poetryBlocks = resolvePoetryBlocks?.(verseGroup.bookAbbr, verseGroup.chapter) ?? [];
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
      const poetryLevel = first != null ? poetryLevelForVerse(poetryBlocks, first) : 0;
      const paraClass =
        poetryLevel > 0
          ? scripturePoetryClassName(poetryLevel, group.isContinuation)
          : scriptureParagraphClassName(group.isContinuation);
      nodes.push(
        <p
          key={`p-${verseGroup.bookAbbr}-${verseGroup.chapter}-${first}`}
          className={paraClass}
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
