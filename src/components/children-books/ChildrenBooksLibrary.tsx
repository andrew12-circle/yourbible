import { BookOpen } from "lucide-react";
import { ChildrenBookCoverThumbnail } from "@/components/children-books/ChildrenBookCoverSpread";
import type { ChildrenBook } from "@/lib/children-books/storybook";
import { cn } from "@/lib/utils";

/** Fixed shelf tile — matches Apple Books cover proportions (2:3). */
const COVER_TILE_CLASS = "w-[9.5rem] shrink-0 aspect-[2/3]";

type ChildrenBooksLibraryProps = {
  books: ChildrenBook[];
  showHubShell: boolean;
  onSelectBook: (slug: string) => void;
};

function BookCover({ book, onSelect }: { book: ChildrenBook; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-[9.5rem] flex-col items-center gap-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fabric rounded-xl"
    >
      <div
        className={cn(
          "relative transition duration-300 ease-out",
          COVER_TILE_CLASS,
          "group-hover:-translate-y-1 group-hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.35)]",
        )}
      >
        <ChildrenBookCoverThumbnail
          book={book}
          className="h-full w-full shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)] transition-shadow duration-300 group-hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.35)]"
        />
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-3">
          <BookOpen className="h-4 w-4 text-white/90 drop-shadow" aria-hidden />
          <div>
            <p className="line-clamp-3 font-display text-[10px] font-semibold leading-tight text-white drop-shadow">
              {book.title}
            </p>
            <p className="mt-0.5 text-[9px] text-white/80">{book.ageRange}</p>
          </div>
        </div>
      </div>
      <span className="w-full text-center text-xs leading-snug text-leather/90 line-clamp-2 transition group-hover:text-leather">
        {book.title}
      </span>
    </button>
  );
}

export function ChildrenBooksLibrary({ books, showHubShell, onSelectBook }: ChildrenBooksLibraryProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden bg-fabric",
        showHubShell ? "h-full" : "h-[100dvh]",
      )}
    >
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 text-center sm:mb-10">
            <h1 className="font-display text-3xl text-leather sm:text-4xl">Children&apos;s books</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Faith-filled stories for ages 4–8
            </p>
          </header>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-10 sm:justify-start sm:gap-x-10">
            {books.map((book) => (
              <BookCover key={book.slug} book={book} onSelect={() => onSelectBook(book.slug)} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
