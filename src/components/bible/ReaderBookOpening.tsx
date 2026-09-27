import { findBookByAbbr } from "@/data/books";
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
