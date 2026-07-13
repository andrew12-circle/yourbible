import { BookOpen } from "lucide-react";
import { ChildrenBookCoverThumbnail } from "@/components/children-books/ChildrenBookCoverSpread";
import type { ChildrenBook } from "@/lib/children-books/storybook";
import { cn } from "@/lib/utils";

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
      className="group flex flex-col items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fabric rounded-xl"
    >
      <div
        className={cn(
          "relative w-full max-w-[9.5rem] transition duration-300 ease-out",
          "group-hover:-translate-y-1 group-hover:shadow-xl",
        )}
      >
        <ChildrenBookCoverThumbnail
          book={book}
          className="group-hover:shadow-xl transition-shadow duration-300"
        />
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-3 sm:p-4">
          <BookOpen className="h-5 w-5 text-white/90 drop-shadow" aria-hidden />
          <div>
            <p className="font-display text-[11px] font-semibold leading-tight text-white drop-shadow sm:text-xs">
              {book.title}
            </p>
            <p className="mt-1 text-[9px] text-white/80 sm:text-[10px]">{book.ageRange}</p>
          </div>
        </div>
      </div>
      <span className="max-w-[9.5rem] text-center text-xs leading-snug text-leather/90 transition group-hover:text-leather">
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

          <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
            {books.map((book) => (
              <BookCover key={book.slug} book={book} onSelect={() => onSelectBook(book.slug)} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
