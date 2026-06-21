import { BOOKS, findBookByAbbr, findBookByName } from "@/data/books";

const BOOK_ALIASES: Record<string, string> = {
  jn: "Jhn",
  john: "Jhn",
  matt: "Mat",
  mt: "Mat",
  mk: "Mrk",
  mark: "Mrk",
  lk: "Luk",
  luke: "Luk",
  gen: "Gen",
  gn: "Gen",
  ps: "Psa",
  psa: "Psa",
  rom: "Rom",
  rm: "Rom",
  rev: "Rev",
  rv: "Rev",
  neh: "Neh",
  jr: "Jer",
  jer: "Jer",
  ezk: "Ezk",
  gl: "Gal",
  gal: "Gal",
  php: "Php",
  phl: "Php",
  ex: "Exo",
  exo: "Exo",
};

export type ParsedBibleReference = {
  bookAbbr: string;
  chapter: number;
  verse?: number;
};

/** Parse references like "John 3:16", "Jn 3", "1 John 4:7-8". */
export function parseBibleReference(input: string): ParsedBibleReference | null {
  const q = input.trim().replace(/\s+/g, " ");
  if (!q) return null;

  const m =
    /^((?:\d\s*)?[A-Za-z.]+(?:\s+[A-Za-z.]+)?)\s+(\d+)(?:\s*:\s*(\d+))?(?:\s*[-–—]\s*\d+)?$/i.exec(q);
  if (!m) return null;

  const bookPart = m[1]!.replace(/\./g, "").trim();
  const chapter = parseInt(m[2]!, 10);
  const verse = m[3] ? parseInt(m[3], 10) : undefined;
  if (!Number.isFinite(chapter) || chapter < 1) return null;

  const alias = BOOK_ALIASES[bookPart.toLowerCase()];
  if (alias) return { bookAbbr: alias, chapter, verse };

  const byAbbr = findBookByAbbr(bookPart);
  if (byAbbr) return { bookAbbr: byAbbr.abbr, chapter, verse };

  const normalized = bookPart.toLowerCase();
  const byName = BOOKS.find(
    (b) =>
      b.name.toLowerCase() === normalized ||
      b.name.toLowerCase().startsWith(normalized) ||
      normalized.startsWith(b.name.toLowerCase().slice(0, 3)),
  );
  if (byName) return { bookAbbr: byName.abbr, chapter, verse };

  const fuzzy = findBookByName(bookPart);
  if (fuzzy) return { bookAbbr: fuzzy.abbr, chapter, verse };

  return null;
}

/** True when the query looks like a scripture reference rather than keyword search. */
export function looksLikeBibleReference(query: string): boolean {
  return parseBibleReference(query) != null;
}
