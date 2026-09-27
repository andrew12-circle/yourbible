import { fallbackBookIntroduction } from "@/data/bookIntroFallbacks";
import { findBookByAbbr } from "@/data/books";
import "./readerBookOpening.css";

/** Local editorial context, not a publisher quotation or additional Scripture.
 * Rendered by the same component in measured and visible page content. */
export function ReaderBookOpening({ bookAbbr }: { bookAbbr: string }) {
  const book = findBookByAbbr(bookAbbr);
  if (!book) return null;
  const intro = fallbackBookIntroduction(book.abbr);
  // This source is the bundled, plain paragraph copy (not remote or user HTML).
  const summary = intro?.html.replace(/<[^>]+>/g, "").trim();
  const label = book.section === "gospels" ? "The Gospel according to"
    : book.testament === "OT" ? "Old Testament" : "New Testament";
  return (
    <section className="reader-book-opening" data-reader-book-opening={book.abbr}
      aria-label={`${book.name} book introduction`}>
      <p className="reader-book-opening-kicker">{label}</p>
      <h2 className="reader-book-opening-title">{book.name}</h2>
      {summary ? <p className="reader-book-opening-summary">{summary}</p> : null}
      <div className="reader-book-opening-rule" aria-hidden="true" />
    </section>
  );
}
