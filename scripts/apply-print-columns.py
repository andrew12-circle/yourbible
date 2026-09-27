# Temporary source transport; the application workflow removes this file before committing.
from pathlib import Path
import os, subprocess
assert os.environ.get('GITHUB_REF') == 'refs/heads/fix/print-book-columns-20260927'
subprocess.run(['git','diff','--exit-code','304091caaa9d730eaf13d4a95b9bcbbd58b314fd','HEAD','--','src','scripts/test-bible-book-openings.mjs'],check=True)
def edit(name, old, new, count=-1):
    p=Path(name);s=p.read_text();assert old in s, name+' missing expected source';p.write_text(s.replace(old,new,count))
Path('src/lib/bible/readerBookEnd.ts').write_text('''import { findBookByAbbr } from "@/data/books";
import type { PassageVerse } from "./api";
import type { ReaderChapterPassage, ReaderStreamUnit } from "./readerStream";
import { readerVerseFragment } from "./readerVerseFragments";
import { versePlainText } from "./verseParts";

type VerseGroup = { bookAbbr: string; chapter: number; verses: PassageVerse[] };

/** Balance only the physical page containing the complete last verse of a book,
 * never the provisional end of a loaded chapter/window or an earlier fragment. */
function completesBook(
  bookAbbr: string, chapter: number, verse: PassageVerse, end: number,
  chapters: readonly ReaderChapterPassage[],
): boolean {
  const book = findBookByAbbr(bookAbbr);
  if (!book || chapter !== book.chapters) return false;
  const last = chapters.find(ch => ch.bookAbbr === bookAbbr && ch.chapter === chapter)?.verses.at(-1);
  return !!last && last.number === verse.number && end === versePlainText(last).length
    && versePlainText(verse) === versePlainText(last);
}

export function readerPageEndsBook(
  groups: readonly VerseGroup[], chapters: readonly ReaderChapterPassage[],
): boolean {
  const group = groups.at(-1), verse = group?.verses.at(-1);
  if (!group || !verse) return false;
  const fragment = readerVerseFragment(verse), original = fragment?.original ?? verse;
  return completesBook(group.bookAbbr, group.chapter, original,
    fragment?.end ?? versePlainText(original).length, chapters);
}

/** Same decision on the original units used by the hidden page measurement. */
export function readerStreamEndsBook(
  slice: readonly ReaderStreamUnit[], chapters: readonly ReaderChapterPassage[],
): boolean {
  for (let i = slice.length - 1; i >= 0; i--) {
    const unit = slice[i];
    if (unit.kind === "verse") {
      return completesBook(unit.bookAbbr, unit.chapter, unit.verse,
        unit.verseRange?.end ?? versePlainText(unit.verse).length, chapters);
    }
  }
  return false;
}
''')
Path('src/components/bible/ReaderBookOpening.tsx').write_text('''import { findBookByAbbr } from "@/data/books";
import "./readerBookOpening.css";

/** A print-style running opening, not an introduction inserted into column one.
 * The shared spanner reserves the same space above BOTH Scripture columns. */
export function ReaderBookOpening({ bookAbbr }: { bookAbbr: string }) {
  const book = findBookByAbbr(bookAbbr);
  if (!book) return null;
  return (
    <section className="reader-book-opening" data-reader-book-opening={book.abbr}
      aria-label={`${book.name} book opening`}>
      <h2 className="reader-book-opening-title">{book.name}</h2>
    </section>
  );
}
''')
Path('src/components/bible/readerBookOpening.css').write_text('''/* The same spanner is used by visible pages and the hidden paginator. Reserve
   one compact, full-page title band instead of pushing only column one down. */
[data-reading-area] .reader-book-opening {
  column-span: all;
  -webkit-column-span: all;
  margin: 0 0 0.8em;
  padding: 0.3em 0 0.45em;
  text-align: start;
  text-indent: 0;
  break-inside: avoid;
  break-after: avoid;
  -webkit-column-break-inside: avoid;
  -webkit-column-break-after: avoid;
}
[data-reading-area] .reader-book-opening-title {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.85em;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}
/* The opening section label (e.g. PROLOGUE) is in the same full-width band.
   Scripture in both columns consequently starts below it on the same line. */
[data-reading-area] .reader-book-opening + .scripture-heading {
  column-span: all;
  -webkit-column-span: all;
  margin-block: 0 0.3em;
}
''')
p='src/lib/bible/readerColumnMeasure.ts'
edit(p,'  columnCount?: number;','  columnCount?: number;\n  /** The final physical page of a book balances its already-measured text. */\n  balanceColumns?: boolean;')
edit(p,'export function scriptureColumnWrapperStyle(contentHeightPx?: number): CSSProperties {','export function scriptureColumnWrapperStyle(contentHeightPx?: number, balanceColumns = false): CSSProperties {')
edit(p,'    columnFill: "auto",\n    WebkitColumnFill: "auto",','    columnFill: balanceColumns ? "balance" : "auto",\n    WebkitColumnFill: balanceColumns ? "balance" : "auto",')
edit(p,'  const columnCount = options?.columnCount ?? 2;','  const columnCount = options?.columnCount ?? 2;\n  const fill = options?.balanceColumns ? "balance" : "auto";')
edit(p,'column-fill:auto;-webkit-column-fill:auto;columns:${columnCount}','column-fill:${fill};-webkit-column-fill:${fill};columns:${columnCount}')
p='src/lib/bible/readerScriptureRender.tsx'
edit(p,'  onNavigateRef?: (book: string, chapter: number, verse: number) => void,\n): ReactNode {','  onNavigateRef?: (book: string, chapter: number, verse: number) => void,\n  balanceColumns = false,\n): ReactNode {',1)
edit(p,'scriptureColumnWrapperStyle(columnHeightPx)','scriptureColumnWrapperStyle(columnHeightPx, balanceColumns)')
edit(p,'            style={columnsStyle}','            data-reader-terminal-columns={balanceColumns || undefined}\n            style={columnsStyle}')
edit(p,'  contentHeightPx?: number,\n): ReactNode {\n  const columnsClass','  contentHeightPx?: number,\n  balanceColumns = false,\n): ReactNode {\n  const columnsClass')
edit(p,'      style={scrollMode ? undefined : scriptureColumnWrapperStyle(contentHeightPx)}','      data-reader-terminal-columns={balanceColumns || undefined}\n      style={scrollMode ? undefined : scriptureColumnWrapperStyle(contentHeightPx, balanceColumns)}')
p='src/pages/reader/renderReaderPageScripture.tsx'
pth=Path(p);pth.write_text('import { readerPageEndsBook } from "@/lib/bible/readerBookEnd";\n'+pth.read_text())
edit(p,'  if (useStudyPageStack) {','  const balanceColumns = !scrollMode && readerPageEndsBook(\n    streamSlice?.verseGroups ?? (slice ? [{ bookAbbr: book.abbr, chapter, verses: slice }] : []),\n    streamChapters,\n  );\n\n  if (useStudyPageStack) {')
edit(p,'      holmanNavigateRef,\n    );','      holmanNavigateRef,\n      balanceColumns,\n    );')
edit(p,'    scriptureColumnHeightPx,\n  );','    scriptureColumnHeightPx,\n    balanceColumns,\n  );')
p='src/components/bible/BookPaginator.tsx'
pth=Path(p);pth.write_text('import { readerStreamEndsBook } from "@/lib/bible/readerBookEnd";\n'+pth.read_text())
edit(p,'const options = spreadMode && columnsClassName ? { columnCount: 2 as const, measureWidthPx: pageWidth } : undefined;','const options = { balanceColumns: readerStreamEndsBook(slice, chapters),\n        ...(spreadMode && columnsClassName ? { columnCount: 2 as const, measureWidthPx: pageWidth } : {}),\n      };')
edit('src/lib/bible/readerStream.ts','READER_PAGINATOR_SPLIT_REVISION = 24','READER_PAGINATOR_SPLIT_REVISION = 25')
p='src/components/bible/ReaderBookOpening.test.tsx'
edit(p,'supplies a title and local introduction for every standard book without a query','supplies a compact title for every book without decorative introduction copy or a query')
edit(p,'expect(page.querySelector(".reader-book-opening-summary")?.textContent?.length).toBeGreaterThan(30);','expect(page.querySelector(".reader-book-opening-summary")).toBeNull();\n      expect(page.querySelector(".reader-book-opening-kicker")).toBeNull();')
edit(p,'places MARK and its introduction before chapter one','places MARK before chapter one')
edit(p,'expect(page.querySelector(".reader-book-opening-kicker")?.textContent).toBe("The Gospel according to");','expect(page.querySelector("h2")?.textContent).toBe("Mark");\n    expect(page.querySelector(".reader-book-opening-rule")).toBeNull();')
Path('.github/workflows/export-print-column-workspace.yml').unlink()
