import { Fragment, type ReactNode } from "react";
import { ScripturePlate } from "@/components/bible/ScripturePlate";
import type { PassageVerse, PoetryBlock } from "@/lib/bible/api";
import { buildReaderStream, type ReaderChapterPassage } from "@/lib/bible/readerStream";

type Groups = { bookAbbr: string; chapter: number; verses: PassageVerse[] }[];
type RenderNodes = (groups: Groups, paragraphs: (book: string, chapter: number) => Set<number>, headings: (book: string, chapter: number) => Map<number, string>, poetry: (book: string, chapter: number) => PoetryBlock[]) => ReactNode;

/** The same verse/plate order used by page mode, including mid-chapter artwork. */
export function renderReaderScrollStream(chapters: ReaderChapterPassage[], renderNodes: RenderNodes): ReactNode {
  return chapters.map((chapter) => {
    const output: ReactNode[] = [];
    let batch: PassageVerse[] = [];
    const flush = () => {
      if (!batch.length) return;
      output.push(<Fragment key={`text-${chapter.bookAbbr}-${chapter.chapter}-${batch[0].number}`}>
        {renderNodes([{ bookAbbr: chapter.bookAbbr, chapter: chapter.chapter, verses: batch }], () => new Set(chapter.paragraphStarts), () => new Map(chapter.headings.map((h) => [h.beforeVerse, h.text])), () => chapter.poetryBlocks)}
      </Fragment>);
      batch = [];
    };
    for (const unit of buildReaderStream([chapter])) {
      if (unit.kind === "plate") { flush(); output.push(<ScripturePlate key={unit.plate.id} plate={unit.plate} compact />); }
      else if (unit.kind === "verse") batch.push(unit.verse);
    }
    flush();
    return <Fragment key={`${chapter.bookAbbr}-${chapter.chapter}`}>{output}</Fragment>;
  });
}
