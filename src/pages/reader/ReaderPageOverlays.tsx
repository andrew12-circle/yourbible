import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VerseSheet } from "@/components/bible/VerseSheet";
import { NoteDialog } from "@/components/bible/NoteDialog";
import { BookmarkDialog } from "@/components/bible/BookmarkDialog";
import { CompanionPane } from "@/components/reader/CompanionPane";
import { ReaderFloatingTabBar } from "@/components/bible/ReaderFloatingTabBar";
import type { ChapterContextBundle } from "@/data/biblePlates/types";
import { ChapterContextSheet } from "@/components/bible/ChapterContextSheet";
import type { Book } from "@/data/books";
import type { PassageVerse } from "@/lib/bible/api";

type NoteState = { verse: number } | null;
type BookmarkState = { position: number } | null;

type Props = {
  overlayPos: string;
  focusMode: boolean;
  readerSpread: boolean;
  spreadStudyActive?: boolean;
  setFocusMode: (v: boolean) => void;
  activeVerse: PassageVerse | null;
  sheetOpen: boolean;
  setSheetOpen: (v: boolean) => void;
  book: Book;
  chapter: number;
  noteOpen: NoteState;
  setNoteOpen: (v: NoteState) => void;
  noteFor: (verse: number) => { body: string } | undefined;
  upsertNote: (verse: number, body: string) => void;
  deleteNote: (verse: number) => void;
  bmDialog: BookmarkState;
  setBmDialog: (v: BookmarkState) => void;
  bookmarkVerse: number;
  bookmarks: { position: number; label?: string; color?: string }[];
  setBookmark: (bm: {
    position: number;
    label: string;
    color: string;
    book: string;
    chapter: number;
    verse: number;
  }) => void;
  toast: (opts: { title: string; description?: string }) => void;
  anchorBelief: { id: string; statement: string } | null | undefined;
  showReaderDock: boolean;
  chapterContextOpen: boolean;
  setChapterContextOpen: (open: boolean) => void;
  chapterCtx: ChapterContextBundle;
};

export function ReaderPageOverlays({
  overlayPos,
  focusMode,
  readerSpread,
  spreadStudyActive = false,
  setFocusMode,
  activeVerse,
  sheetOpen,
  setSheetOpen,
  book,
  chapter,
  noteOpen,
  setNoteOpen,
  noteFor,
  upsertNote,
  deleteNote,
  bmDialog,
  setBmDialog,
  bookmarkVerse,
  bookmarks,
  setBookmark,
  toast,
  anchorBelief,
  showReaderDock,
  chapterContextOpen,
  setChapterContextOpen,
  chapterCtx,
}: Props) {
  const navigate = useNavigate();

  return (
    <>
      {activeVerse ? (
        <VerseSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          reference={`${book.name} ${chapter}:${activeVerse.number}`}
          verseText={activeVerse.text}
          bookAbbr={book.abbr}
          chapter={chapter}
          verseNumber={activeVerse.number}
        />
      ) : null}

      {noteOpen ? (
        <NoteDialog
          open
          reference={`${book.name} ${chapter}:${noteOpen.verse}`}
          initialBody={noteFor(noteOpen.verse)?.body}
          onClose={() => setNoteOpen(null)}
          onSave={(body) => {
            upsertNote(noteOpen.verse, body);
          }}
          onDelete={noteFor(noteOpen.verse) ? () => deleteNote(noteOpen.verse) : undefined}
        />
      ) : null}

      {bmDialog ? (
        <BookmarkDialog
          open
          position={bmDialog.position}
          defaultRef={{ book: book.abbr, bookName: book.name, chapter }}
          defaultLabel={bookmarks.find((b) => b.position === bmDialog.position)?.label}
          defaultColor={bookmarks.find((b) => b.position === bmDialog.position)?.color}
          onClose={() => setBmDialog(null)}
          onSave={(label, color) => {
            setBookmark({
              position: bmDialog.position,
              label,
              color,
              book: book.abbr,
              chapter,
              verse: bookmarkVerse,
            });
            toast({
              title: "Ribbon saved",
              description: `${label} → ${book.name} ${chapter}:${bookmarkVerse}`,
            });
            setBmDialog(null);
          }}
        />
      ) : null}

      {anchorBelief && !focusMode ? (
        <button
          onClick={() => navigate(`/framework/beliefs/${anchorBelief.id}`)}
          className={`${overlayPos} top-14 left-1/2 -translate-x-1/2 z-30 max-w-[min(680px,92vw)] bg-paper border border-gold/50 rounded-full shadow-leather px-4 py-1.5 text-xs flex items-center gap-2 hover:bg-paper-warm transition`}
          title="Your anchor belief for this chapter"
        >
          <Sparkles className="w-3.5 h-3.5 text-leather shrink-0" />
          <span className="ink-text truncate">{anchorBelief.statement}</span>
        </button>
      ) : null}

      {!focusMode && !spreadStudyActive ? <CompanionPane /> : null}

      {showReaderDock ? (
        <ReaderFloatingTabBar bibleTo={`/read/${book.abbr}/${chapter}`} />
      ) : null}

      <ChapterContextSheet
        open={chapterContextOpen}
        onOpenChange={setChapterContextOpen}
        context={chapterCtx}
        bookName={book.name}
      />
    </>
  );
}
