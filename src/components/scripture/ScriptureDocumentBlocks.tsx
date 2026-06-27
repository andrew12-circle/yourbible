import type { ReactNode } from "react";
import type { DocumentBlock, RenderVerse } from "@/lib/bible/documentModel";
import { ScriptureHeading, ScriptureParagraph } from "./ScriptureComponents";

export function ScriptureDocumentBlocks({
  blocks,
  renderVerse,
}: {
  blocks: DocumentBlock[];
  renderVerse: (
    v: RenderVerse,
    ctx: { bookAbbr: string; chapter: number; paragraphIsContinuation: boolean },
  ) => ReactNode;
}) {
  return blocks.flatMap((block, i) => {
    if (block.type === "heading") {
      return [
        <ScriptureHeading key={`h-${block.beforeVerseId}-${i}`}>{block.text}</ScriptureHeading>,
      ];
    }
    return [
      <ScriptureParagraph
        key={`p-${block.bookAbbr}-${block.chapter}-${block.verses[0]?.number}-${i}`}
        poetryLevel={block.poetryLevel}
        isContinuation={block.isContinuation}
      >
        {block.verses.map((v) =>
          renderVerse(v, {
            bookAbbr: block.bookAbbr,
            chapter: block.chapter,
            paragraphIsContinuation: block.isContinuation,
          }),
        )}
      </ScriptureParagraph>,
    ];
  });
}
