import type { CSSProperties, ReactNode } from "react";
import type { PassageVerse, PoetryBlock } from "@/lib/bible/api";
import {
  collectHolmanXrefsFromGroups,
  collectPageFootnotes,
  groupHolmanXrefsByVerse,
  holmanConnectionsClassName,
  holmanConnectionsKey,
  holmanHeadingClassName,
  holmanHeadingText,
  holmanPageFootnotesClassName,
  splitHolmanVerseGroupsByColumn,
  type HolmanVerseRefGroup,
} from "@/lib/bible/holmanStudyLayout";
import {
  groupVersesIntoParagraphs,
  poetryLevelForVerse,
} from "@/lib/bible/parsePassageHtml";
import {
  readerColumnClassName,
  type ReaderColumnLayout,
} from "@/lib/bible/readerColumnLayout";
import {
  holmanChromeBelowColumnsPx,
  readerScriptureColumnsHeightPx,
  scriptureColumnWrapperStyle,
} from "@/lib/bible/readerColumnMeasure";
import type { ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";
import {
  ScriptureHeading,
  ScriptureParagraph,
} from "@/components/scripture/ScriptureComponents";
import { cn } from "@/lib/utils";

export interface ScriptureRenderOptions {
  studyLayout?: ResolvedStudyLayout;
}

export type HolmanVerseGroup = { chapter: number; verses: PassageVerse[] };

function HolmanConnectionsParagraph({
  grouped,
  onNavigateRef,
}: {
  grouped: HolmanVerseRefGroup[];
  onNavigateRef?: (book: string, chapter: number, verse: number) => void;
}) {
  return (
    <p className={holmanConnectionsClassName()}>
      {grouped.map((group, groupIndex) => (
        <span key={`${group.chapter}:${group.verse}`} className="scripture-connections-entry">
          {groupIndex > 0 ? " " : null}
          <strong className="scripture-connections-anchor">
            {group.chapter}:{group.verse}
          </strong>
          {group.refs.map((ref) => (
            <span key={`${group.chapter}:${group.verse}:${ref.letter}`} className="scripture-connections-ref">
              {" "}
              <span className="scripture-connections-letter">{ref.letter}</span>{" "}
              {onNavigateRef ? (
                <button
                  type="button"
                  className="scripture-connections-link"
                  onClick={() => onNavigateRef(ref.book, ref.targetChapter, ref.targetVerse)}
                  title={`Go to ${ref.label}`}
                >
                  {ref.label}
                </button>
              ) : (
                ref.label
              )}
            </span>
          ))}
        </span>
      ))}
    </p>
  );
}

export function HolmanConnectionsBlock({
  groups,
  dualColumn = false,
  onNavigateRef,
}: {
  groups: HolmanVerseGroup[];
  dualColumn?: boolean;
  onNavigateRef?: (book: string, chapter: number, verse: number) => void;
}) {
  if (dualColumn) {
    const [leftGroups, rightGroups] = splitHolmanVerseGroupsByColumn(groups, 2);
    const leftGrouped = groupHolmanXrefsByVerse(collectHolmanXrefsFromGroups(leftGroups));
    const rightGrouped = groupHolmanXrefsByVerse(collectHolmanXrefsFromGroups(rightGroups));
    if (leftGrouped.length === 0 && rightGrouped.length === 0) return null;
    return (
      <div
        className="scripture-connections-row scripture-connections-row--dual"
        aria-label="Cross references"
      >
        <div className="scripture-connections-col">
          {leftGrouped.length > 0 ? (
            <HolmanConnectionsParagraph grouped={leftGrouped} onNavigateRef={onNavigateRef} />
          ) : null}
        </div>
        <div className="scripture-connections-col">
          {rightGrouped.length > 0 ? (
            <HolmanConnectionsParagraph grouped={rightGrouped} onNavigateRef={onNavigateRef} />
          ) : null}
        </div>
      </div>
    );
  }

  const grouped = groupHolmanXrefsByVerse(collectHolmanXrefsFromGroups(groups));
  if (grouped.length === 0) return null;
  return (
    <div className="scripture-connections-row scripture-connections-row-full" aria-label="Cross references">
      <HolmanConnectionsParagraph grouped={grouped} onNavigateRef={onNavigateRef} />
    </div>
  );
}

export function HolmanPageFootnotes({ verses }: { verses: PassageVerse[] }) {
  const notes = collectPageFootnotes(verses);
  if (notes.length === 0) return null;
  return (
    <div className={holmanPageFootnotesClassName()}>
      {notes.map((note) => (
        <span key={note.marker} className="scripture-page-footnotes-line">
          <sup className="scripture-page-footnotes-marker">{note.marker}</sup>
          <span>{note.text}</span>
        </span>
      ))}
    </div>
  );
}

export function wrapHolmanStudyContent(
  columnLayout: ReaderColumnLayout,
  scrollMode: boolean,
  scripture: ReactNode,
  verseGroups: HolmanVerseGroup[],
  footnotes: ReactNode | null,
  showConnections = true,
  contentHeightPx?: number,
  onNavigateRef?: (book: string, chapter: number, verse: number) => void,
): ReactNode {
  const columnsClass = readerColumnClassName(columnLayout);
  const hasColumns = Boolean(columnsClass);
  const chromeBelow = !scrollMode
    ? holmanChromeBelowColumnsPx({
        hasFootnotes: footnotes != null,
        hasConnections: showConnections,
      })
    : 0;
  const stackStyle: CSSProperties | undefined =
    !scrollMode && contentHeightPx != null && contentHeightPx > 0
      ? {
          height: contentHeightPx,
          maxHeight: contentHeightPx,
          overflow: "hidden",
          boxSizing: "border-box",
        }
      : undefined;
  const columnHeightPx =
    !scrollMode && contentHeightPx != null && contentHeightPx > 0
      ? readerScriptureColumnsHeightPx(contentHeightPx, chromeBelow)
      : undefined;
  const scriptureSectionStyle: CSSProperties | undefined =
    !scrollMode && columnHeightPx != null && columnHeightPx > 0
      ? {
          height: columnHeightPx,
          maxHeight: columnHeightPx,
          flex: "0 0 auto",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          minWidth: 0,
        }
      : undefined;
  const columnsStyle: CSSProperties | undefined =
    !scrollMode && hasColumns
      ? columnHeightPx != null && columnHeightPx > 0
        ? {
            ...scriptureColumnWrapperStyle(columnHeightPx),
            height: "100%",
            maxHeight: "100%",
          }
        : scriptureColumnWrapperStyle(columnHeightPx)
      : undefined;

  return (
    <div
      className={cn(
        "scripture-page-stack holman-study-stack",
        !scrollMode && "min-h-0 flex flex-col",
        !scrollMode && !stackStyle && "h-full",
      )}
      style={stackStyle}
    >
      <div
        className={cn(
          !scrollMode &&
            columnHeightPx == null &&
            "flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col",
        )}
        style={scriptureSectionStyle}
      >
        {columnsClass ? (
          <div
            className={cn(columnsClass, !scrollMode && "min-h-0 overflow-hidden flex-1")}
            style={columnsStyle}
          >
            {scripture}
          </div>
        ) : (
          <div className={cn(!scrollMode && "flex-1 min-h-0 overflow-hidden")}>{scripture}</div>
        )}
      </div>
      {showConnections ? (
        <HolmanConnectionsBlock
          key={holmanConnectionsKey(verseGroups)}
          groups={verseGroups}
          dualColumn={hasColumns}
          onNavigateRef={onNavigateRef}
        />
      ) : null}
      {footnotes}
    </div>
  );
}

export function wrapScriptureColumns(
  layout: ReaderColumnLayout,
  scrollMode: boolean,
  children: ReactNode,
  contentHeightPx?: number,
): ReactNode {
  const columnsClass = readerColumnClassName(layout);
  if (!columnsClass) return children;
  const sized = !scrollMode && contentHeightPx != null && contentHeightPx > 0;
  return (
    <div
      className={cn(columnsClass, !scrollMode && !sized && "h-full w-full min-h-0")}
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
  options?: ScriptureRenderOptions,
): ReactNode {
  const holman = options?.studyLayout === "holman";
  return groups.flatMap((verseGroup) => {
    const paragraphStartSet = resolveParagraphStarts(verseGroup.bookAbbr, verseGroup.chapter);
    const headingMap = resolveHeading(verseGroup.bookAbbr, verseGroup.chapter);
    const poetryBlocks = resolvePoetryBlocks?.(verseGroup.bookAbbr, verseGroup.chapter) ?? [];
    return groupVersesIntoParagraphs(verseGroup.verses, paragraphStartSet).flatMap((group) => {
      const nodes: ReactNode[] = [];
      const first = group.verses[0]?.number;
      const heading = first != null ? headingMap.get(first) : undefined;
      const unitKey = `${verseGroup.bookAbbr}-${verseGroup.chapter}-${first}`;
      const poetryLevel = first != null ? poetryLevelForVerse(poetryBlocks, first) : 0;

      if (heading) {
        nodes.push(
          <ScriptureHeading
            key={`h-${unitKey}`}
            className={holman ? holmanHeadingClassName(verseGroup.bookAbbr) : undefined}
          >
            {holman ? holmanHeadingText(heading) : heading}
          </ScriptureHeading>,
        );
      }
      nodes.push(
        <ScriptureParagraph
          key={`p-${unitKey}`}
          poetryLevel={poetryLevel}
          isContinuation={group.isContinuation}
        >
          {group.verses.map((v) =>
            renderVerse(v, {
              bookAbbr: verseGroup.bookAbbr,
              chapter: verseGroup.chapter,
              paragraphIsContinuation: group.isContinuation,
            }),
          )}
        </ScriptureParagraph>,
      );
      return nodes;
    });
  });
}
