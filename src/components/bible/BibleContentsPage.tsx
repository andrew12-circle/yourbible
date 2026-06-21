import { BOOKS } from "@/data/books";
import {
  CONTENTS_BACK_MATTER,
  CONTENTS_FRONT_MATTER,
  bookToContentsRow,
  newTestamentBooks,
  oldTestamentBooks,
  splitBooksTwoColumns,
  type ContentsRow,
} from "@/lib/bible/bibleContents";
import { cn } from "@/lib/utils";

interface Props {
  onSelectBook: (bookAbbr: string, chapter?: number) => void;
  onSelectStudySection?: (sectionId: string) => void;
  className?: string;
  /** Spread mode: show one testament per page face. */
  testamentFilter?: "all" | "ot" | "nt";
}

function formatPage(page: number | string, style?: ContentsRow["pageStyle"]): string {
  if (page === "" || page == null) return "";
  if (typeof page === "string") return page;
  return String(page);
}

function ContentsEntry({
  row,
  onSelect,
  onSelectStudy,
}: {
  row: ContentsRow;
  onSelect: (bookAbbr: string, chapter?: number) => void;
  onSelectStudy?: (sectionId: string) => void;
}) {
  const pageLabel = formatPage(row.page, row.pageStyle);
  const body = (
    <>
      <span className="bible-toc-label">{row.label}</span>
      <span className="bible-toc-leader" aria-hidden />
      {pageLabel ? <span className="bible-toc-page">{pageLabel}</span> : null}
    </>
  );

  if (row.clickable && row.studySection && onSelectStudy) {
    return (
      <button
        type="button"
        className="bible-toc-entry bible-toc-entry-button"
        onClick={() => onSelectStudy(row.studySection!)}
      >
        {body}
      </button>
    );
  }

  if (row.clickable && row.bookAbbr) {
    return (
      <button
        type="button"
        className="bible-toc-entry bible-toc-entry-button"
        onClick={() => onSelect(row.bookAbbr!, row.chapter ?? 1)}
      >
        {body}
      </button>
    );
  }

  return <div className="bible-toc-entry bible-toc-entry-static">{body}</div>;
}

function BookColumn({
  books,
  onSelect,
  onSelectStudy,
}: {
  books: ReturnType<typeof bookToContentsRow>[];
  onSelect: (bookAbbr: string, chapter?: number) => void;
  onSelectStudy?: (sectionId: string) => void;
}) {
  return (
    <div className="bible-toc-book-column">
      <div className="bible-toc-column-head" aria-hidden>
        <span>BOOK</span>
        <span>PAGE</span>
      </div>
      {books.map((row) => (
        <ContentsEntry key={row.id} row={row} onSelect={onSelect} onSelectStudy={onSelectStudy} />
      ))}
    </div>
  );
}

function TestamentBlock({
  title,
  books,
  onSelect,
}: {
  title: string;
  books: typeof BOOKS;
  onSelect: (bookAbbr: string, chapter?: number) => void;
}) {
  const [left, right] = splitBooksTwoColumns(books);
  return (
    <section className="bible-toc-testament">
      <h3 className="bible-toc-testament-title">{title}</h3>
      <div className="bible-toc-book-grid">
        <BookColumn books={left.map(bookToContentsRow)} onSelect={onSelect} />
        <BookColumn books={right.map(bookToContentsRow)} onSelect={onSelect} />
      </div>
    </section>
  );
}

export function BibleContentsPage({
  onSelectBook,
  onSelectStudySection,
  className,
  testamentFilter = "all",
}: Props) {
  const showFront = testamentFilter === "all" || testamentFilter === "ot";
  const showOt = testamentFilter === "all" || testamentFilter === "ot";
  const showNt = testamentFilter === "all" || testamentFilter === "nt";
  const showBack = testamentFilter === "all" || testamentFilter === "nt";

  return (
    <div className={cn("bible-toc-page font-scripture selectable-text", className)}>
      {(testamentFilter === "all" || testamentFilter === "ot") && (
        <h2 className="bible-toc-main-title">CONTENTS</h2>
      )}
      {testamentFilter === "nt" && (
        <h2 className="bible-toc-main-title bible-toc-main-title-compact">CONTENTS</h2>
      )}

      {showFront ? (
        <div className="bible-toc-front-matter">
          {CONTENTS_FRONT_MATTER.map((row) => (
            <ContentsEntry
              key={row.id}
              row={row}
              onSelect={onSelectBook}
              onSelectStudy={onSelectStudySection}
            />
          ))}
        </div>
      ) : null}

      {showOt || showNt ? (
        <h3 className={cn("bible-toc-section-title", !showFront && "mt-0")}>
          THE BOOKS OF THE BIBLE
        </h3>
      ) : null}

      {showOt ? (
        <TestamentBlock
          title="THE OLD TESTAMENT"
          books={oldTestamentBooks()}
          onSelect={onSelectBook}
        />
      ) : null}

      {showNt ? (
        <TestamentBlock
          title="THE NEW TESTAMENT"
          books={newTestamentBooks()}
          onSelect={onSelectBook}
        />
      ) : null}

      {showBack ? (
        <div className="bible-toc-back-matter">
          {CONTENTS_BACK_MATTER.map((row) => (
            <ContentsEntry
              key={row.id}
              row={row}
              onSelect={onSelectBook}
              onSelectStudy={onSelectStudySection}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
