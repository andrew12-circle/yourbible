import type { BibleBook } from "@/data/books";
import { getBooks, readCanon } from "@/lib/bible/canon";
import type { CodeLabScope, CodeLabScopeKind } from "@/lib/code-lab/types";

export interface ChapterRef {
  book: string;
  bookName: string;
  chapter: number;
}

export function chaptersForScope(scope: CodeLabScope, canon = readCanon()): ChapterRef[] {
  const books = getBooks(canon);
  const refs: ChapterRef[] = [];

  const pushBook = (book: BibleBook) => {
    for (let ch = 1; ch <= book.chapters; ch++) {
      refs.push({ book: book.abbr, bookName: book.name, chapter: ch });
    }
  };

  switch (scope.kind) {
    case "chapter":
      if (!scope.book || !scope.chapter) return refs;
      {
        const b = books.find((x) => x.abbr === scope.book);
        if (b) refs.push({ book: b.abbr, bookName: b.name, chapter: scope.chapter });
      }
      break;
    case "passage":
    case "book":
      if (!scope.book) return refs;
      {
        const b = books.find((x) => x.abbr === scope.book);
        if (b) pushBook(b);
      }
      break;
    case "torah":
      books.filter((b) => b.section === "law").forEach(pushBook);
      break;
    case "ot":
      books.filter((b) => b.testament === "OT").forEach(pushBook);
      break;
    case "nt":
      books.filter((b) => b.testament === "NT").forEach(pushBook);
      break;
    case "full":
      books.forEach(pushBook);
      break;
  }

  return refs;
}

export function scopeLabel(scope: CodeLabScope): string {
  switch (scope.kind) {
    case "chapter":
      return scope.book && scope.chapter
        ? `${scope.book} ${scope.chapter}`
        : "Chapter";
    case "passage":
      if (scope.book && scope.chapter) {
        const v =
          scope.verseStart && scope.verseEnd && scope.verseStart !== scope.verseEnd
            ? `${scope.verseStart}–${scope.verseEnd}`
            : scope.verseStart
              ? String(scope.verseStart)
              : "all";
        return `${scope.book} ${scope.chapter}:${v}`;
      }
      return "Passage";
    case "book":
      return scope.book ?? "Book";
    case "torah":
      return "Torah (Gen–Deu)";
    case "ot":
      return "Old Testament";
    case "nt":
      return "New Testament";
    case "full":
      return "Full Bible";
    default:
      return "Scope";
  }
}

export const SCOPE_KIND_OPTIONS: { kind: CodeLabScopeKind; label: string; hint?: string }[] = [
  { kind: "passage", label: "Chapter / passage", hint: "Best for exploring a section" },
  { kind: "book", label: "Whole book" },
  { kind: "torah", label: "Torah", hint: "Genesis–Deuteronomy" },
  { kind: "ot", label: "Old Testament", hint: "Slow — many chapters" },
  { kind: "nt", label: "New Testament", hint: "Slow — many chapters" },
  { kind: "full", label: "Full Bible", hint: "Very slow first load" },
];

export function bookOptions(): BibleBook[] {
  return getBooks(readCanon());
}

export function defaultDocumentaryScope(): CodeLabScope {
  return {
    kind: "passage",
    book: "Gen",
    chapter: 30,
    verseStart: 20,
    verseEnd: 27,
  };
}
