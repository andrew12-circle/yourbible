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
import { scriptureColumnWrapperStyle } from "@/lib/bible/readerColumnMeasure";
import type { ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";
import {
  scriptureParagraphClassName,
  scripturePoetryClassName,
} from "@/lib/bible/scriptureParagraph";
import { cn } from "@/lib/utils";

export interface ScriptureRenderOptions {
  studyLayout?: ResolvedStudyLayout;
}

export type HolmanVerseGroup = { chapter: number; verses: PassageVerse[] };

function HolmanConnectionsParagraph({ grouped }: { grouped: HolmanVerseRefGroup[] }) {
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
              <span className="scripture-connections-letter">{ref.letter}</span> {ref.label}
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
}: {
  groups: HolmanVerseGroup[];
  dualColumn?: boolean;
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
          {leftGrouped.length > 0 ? <HolmanConnectionsParagraph grouped={leftGrouped} /> : null}
        </div>
        <div className="scripture-connections-col">
          {rightGrouped.length > 0 ? <HolmanConnectionsParagraph grouped={rightGrouped} /> : null}
        </div>
      </div>
    );
  }

  const grouped = groupHolmanXrefsByVerse(collectHolmanXrefsFromGroups(groups));
  if (grouped.length === 0) return null;
  return (
    <div className="scripture-connections-row scripture-connections-row-full" aria-label="Cross references">
      <HolmanConnectionsParagraph grouped={grouped} />
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
): ReactNode {
  const columnsClass = readerColumnClassName(columnLayout);
  const hasColumns = Boolean(columnsClass);
  const stackStyle: CSSProperties | undefined =
    !scrollMode && contentHeightPx != null && contentHeightPx > 0
      ? {
          height: contentHeightPx,
          maxHeight: contentHeightPx,
          overflow: "hidden",
          boxSizing: "border-box",
        }
      : undefined;
  const columnsStyle: CSSProperties | undefined = !scrollMode
    ? {
        overflow: "hidden",
        boxSizing: "border-box",
        columnFill: "auto",
        WebkitColumnFill: "auto",
        width: "100%",
        flex: "1 1 auto",
        minHeight: 0,
      }
    : undefined;

  return (
    <div
      className={cn(
        "holman-study-stack",
        !scrollMode && "min-h-0 flex flex-col",
        !scrollMode && !stackStyle && "h-full",
      )}
      style={stackStyle}
    >
      <div className={cn(!scrollMode && "flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col")}>
        {columnsClass ? (
          <div
            className={cn(columnsClass, !scrollMode && "min-h-0 overflow-hidden")}
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
      const paraClass =
        poetryLevel > 0
          ? scripturePoetryClassName(poetryLevel, group.isContinuation)
          : scriptureParagraphClassName(group.isContinuation);

      if (heading) {
        nodes.push(
          <p
            key={`h-${unitKey}`}
            className={holman ? holmanHeadingClassName(verseGroup.bookAbbr) : "scripture-heading"}
          >
            {holman ? holmanHeadingText(heading) : heading}
          </p>,
        );
      }
      nodes.push(
        <p key={`p-${unitKey}`} className={paraClass} style={{ orphans: 2, widows: 2 }}>
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
