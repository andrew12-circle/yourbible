import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SelectionToolbar, type ToolbarSelection } from "@/components/bible/SelectionToolbar";
import { WordStudySheet } from "@/components/bible/WordStudySheet";
import type { Passage } from "@/lib/bible/api";
import type { Book } from "@/data/books";
import { buildWordStudyContext, wordFromSelection, type WordStudyContext } from "@/lib/bible/wordStudyContext";
import { sharePassageSelection } from "@/lib/bible/shareVerse";
import type { CompanionScope } from "@/lib/reader/companionStore";
import { readerPageSideFromRect } from "@/lib/bible/verseSelection";
import { toast } from "@/hooks/use-toast";

type Props = {
  tbSel: ToolbarSelection | null;
  inkMode: boolean;
  /** Study pane is on the facing page — hide floating toolbar (colors live there). */
  spreadStudyActive?: boolean;
  paletteId: string;
  highlightColor: string;
  hlFor: (verse: number) => { color: string } | undefined;
  ulFor: (verse: number) => unknown;
  onPickHighlight: (color: string) => void;
  onActiveColorChange: (color: string) => void;
  onPickUnderline: () => void;
  onClear: () => void;
  onNote: () => void;
  book: Book;
  chapter: number;
  verses: { number: number; text: string }[];
  passage: Passage | null | undefined;
  bibleId: string;
  reference: string;
  online: boolean;
  openCompanion: (
    scope: CompanionScope,
    tab: "journal",
    anchorPageSide?: "left" | "right" | null,
  ) => void;
  buildScope: (verses: number[]) => CompanionScope;
  clearWindowSelection: () => void;
};

export function ReaderSelectionChrome({
  tbSel,
  inkMode,
  spreadStudyActive = false,
  paletteId,
  highlightColor,
  hlFor,
  ulFor,
  onPickHighlight,
  onActiveColorChange,
  onPickUnderline,
  onClear,
  onNote,
  book,
  chapter,
  verses,
  passage,
  bibleId,
  reference,
  online,
  openCompanion,
  buildScope,
  clearWindowSelection,
}: Props) {
  const navigate = useNavigate();
  const [wordStudyOpen, setWordStudyOpen] = useState(false);
  const [wordStudyContext, setWordStudyContext] = useState<WordStudyContext | null>(null);

  return (
    <>
      <SelectionToolbar
        open={!!tbSel && !inkMode && !spreadStudyActive}
        paletteId={paletteId}
        selection={tbSel}
        currentColor={tbSel ? hlFor(tbSel.verses[0])?.color ?? null : null}
        activeColor={highlightColor}
        currentlyUnderlined={!!tbSel && tbSel.verses.every((v) => !!ulFor(v))}
        onPickHighlight={onPickHighlight}
        onActiveColorChange={onActiveColorChange}
        onPickUnderline={onPickUnderline}
        onClear={onClear}
        onNote={onNote}
        onTestFramework={() => {
          if (!tbSel) return;
          const text = verses
            .filter((v) => tbSel.verses.includes(v.number))
            .map((v) => `${v.number} ${v.text}`)
            .join(" ");
          const refRange =
            tbSel.verses.length > 1
              ? `${book.name} ${chapter}:${tbSel.verses[0]}-${tbSel.verses[tbSel.verses.length - 1]}`
              : `${book.name} ${chapter}:${tbSel.verses[0]}`;
          navigate(
            `/framework/artifacts/new?ref=${encodeURIComponent(refRange)}&verse=${encodeURIComponent(text)}`,
          );
        }}
        onWordStudy={() => {
          if (!tbSel) return;
          const word = wordFromSelection();
          if (!word) {
            toast({
              title: "Select a word",
              description: "Highlight a word for concordance and Strong's lookup.",
            });
            return;
          }
          setWordStudyContext(
            buildWordStudyContext(word, { book, chapter, verses: tbSel.verses, passage }),
          );
          setWordStudyOpen(true);
        }}
        onOpenCompanion={() => {
          if (!tbSel) return;
          if (!online) {
            toast({
              variant: "destructive",
              title: "Companion needs internet",
              description: "Reconnect to use AI features.",
            });
            return;
          }
          openCompanion(buildScope(tbSel.verses), "journal", tbSel.pageSide ?? readerPageSideFromRect(tbSel.rect));
        }}
        onShare={() => {
          if (!tbSel) return;
          void sharePassageSelection(reference, passage ?? null, tbSel.verses);
        }}
        onClose={() => clearWindowSelection()}
      />

      <WordStudySheet
        open={wordStudyOpen}
        onOpenChange={setWordStudyOpen}
        bibleId={bibleId}
        context={wordStudyContext}
      />
    </>
  );
}
