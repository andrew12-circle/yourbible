import { Search, List } from "lucide-react";
import { Link } from "react-router-dom";
import type { BibleBook } from "@/data/books";
import { BOOKS } from "@/data/books";
import {
  readerPickerBookCard,
  readerPickerBookCardSelected,
  readerPickerSearchInput,
  readerPickerSectionLabel,
  readerPickerToggleGroup,
  readerPickerToggleItem,
  readerPickerToggleItemSelected,
} from "@/lib/bible/readerChromeClasses";
import {
  getStoredBookSortMode,
  sortBooksForDisplay,
  storeBookSortMode,
  type BookSortMode,
} from "@/lib/reader/bookPickerSort";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

const SEARCH_PLACEHOLDER = `Search books\u2026`;

interface Props {
  currentBook: BibleBook;
  onPickBook: (book: BibleBook) => void;
  /** 2 cols on narrow screens; 3 on wider (desktop popover). */
  gridCols?: "two" | "responsive";
  className?: string;
}

function BookGrid({
  books,
  currentBook,
  onPickBook,
  gridCols,
}: {
  books: BibleBook[];
  currentBook: BibleBook;
  onPickBook: (book: BibleBook) => void;
  gridCols: "two" | "responsive";
}) {
  return (
    <div
      className={cn(
        "grid gap-1.5",
        gridCols === "responsive" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2",
      )}
    >
      {books.map(b => (
        <button
          key={b.abbr}
          type="button"
          onClick={() => onPickBook(b)}
          className={cn(
            readerPickerBookCard,
            b.abbr === currentBook.abbr && readerPickerBookCardSelected,
          )}
        >
          <span className="block leading-snug">{b.name}</span>
          <span
            className={cn(
              "block text-[10px] font-mono uppercase tracking-wider mt-0.5 transition-colors",
              b.abbr === currentBook.abbr ? "text-zinc-500" : "text-zinc-400 group-hover:text-zinc-500",
            )}
          >
            {b.abbr}
          </span>
        </button>
      ))}
    </div>
  );
}

function TestamentSection({
  label,
  books,
  currentBook,
  onPickBook,
  gridCols,
}: {
  label: string;
  books: BibleBook[];
  currentBook: BibleBook;
  onPickBook: (book: BibleBook) => void;
  gridCols: "two" | "responsive";
}) {
  if (books.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <span className={cn(readerPickerSectionLabel, "shrink-0")}>{label}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-zinc-300/60 to-transparent" aria-hidden />
      </div>
      <BookGrid books={books} currentBook={currentBook} onPickBook={onPickBook} gridCols={gridCols} />
    </section>
  );
}

export function BookPickerStep({ currentBook, onPickBook, gridCols = "responsive", className }: Props) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<BookSortMode>(() => getStoredBookSortMode());

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return BOOKS;
    return BOOKS.filter(b => b.name.toLowerCase().includes(q) || b.abbr.toLowerCase().includes(q));
  }, [search]);

  const otBooks = useMemo(
    () => sortBooksForDisplay(filteredBooks.filter(b => b.testament === "OT"), sortMode),
    [filteredBooks, sortMode],
  );
  const ntBooks = useMemo(
    () => sortBooksForDisplay(filteredBooks.filter(b => b.testament === "NT"), sortMode),
    [filteredBooks, sortMode],
  );

  const onSortChange = (mode: BookSortMode) => {
    setSortMode(mode);
    storeBookSortMode(mode);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Link
        to="/read/contents"
        className={cn(
          readerPickerBookCard,
          "flex items-center justify-center gap-2 col-span-full text-sm font-medium",
        )}
      >
        <List className="w-4 h-4 shrink-0 opacity-70" strokeWidth={2} />
        Table of contents
      </Link>

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" strokeWidth={2} />
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={SEARCH_PLACEHOLDER}
          className={readerPickerSearchInput}
        />
      </div>

      <div role="group" aria-label="Book list order" className={readerPickerToggleGroup}>
        {(
          [
            { value: "canonical" as const, label: "Bible order" },
            { value: "alphabetical" as const, label: "A\u2013Z" },
          ] as const
        ).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={sortMode === value}
            onClick={() => onSortChange(value)}
            className={cn(
              readerPickerToggleItem,
              sortMode === value && readerPickerToggleItemSelected,
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4 min-h-0">
        <TestamentSection
          label="Old Testament"
          books={otBooks}
          currentBook={currentBook}
          onPickBook={onPickBook}
          gridCols={gridCols}
        />
        <TestamentSection
          label="New Testament"
          books={ntBooks}
          currentBook={currentBook}
          onPickBook={onPickBook}
          gridCols={gridCols}
        />
        {filteredBooks.length === 0 && (
          <p className="text-center text-sm text-zinc-500 font-system py-10">
            No books match &ldquo;{search}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
