import type { BibleSearchHit } from "@/lib/bible/api";
import { formatVerseReference } from "./verseId";

type BundledSearchRow = [bookAbbr: string, chapter: number, verse: number, text: string];

type BundledSearchIndex = {
  bibleId: string;
  verses: BundledSearchRow[];
};

const BUNDLED_CSB_SEARCH_URL = "/bibles/csb/search.json";

let bundledIndexPromise: Promise<BundledSearchIndex> | null = null;

function tokenize(query: string): string[] {
  return query
    .toLocaleLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function snippetAround(text: string, tokens: string[], maxLength = 120): string {
  const lower = text.toLocaleLowerCase();
  const matchAt = tokens.reduce<number>((firstMatch, token) => {
    if (firstMatch >= 0) return firstMatch;
    return lower.indexOf(token);
  }, -1);
  if (matchAt < 0) return text.slice(0, maxLength);

  const start = Math.max(0, matchAt - 40);
  const end = Math.min(text.length, start + maxLength);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

function isBundledSearchIndex(value: unknown): value is BundledSearchIndex {
  if (!value || typeof value !== "object") return false;
  const index = value as Partial<BundledSearchIndex>;
  return (
    typeof index.bibleId === "string" &&
    Array.isArray(index.verses) &&
    index.verses.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 4 &&
        typeof row[0] === "string" &&
        typeof row[1] === "number" &&
        typeof row[2] === "number" &&
        typeof row[3] === "string",
    )
  );
}

async function loadBundledCsbSearchIndex(): Promise<BundledSearchIndex> {
  if (!bundledIndexPromise) {
    bundledIndexPromise = fetch(BUNDLED_CSB_SEARCH_URL)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Bundled CSB search index unavailable (${response.status})`);
        const json: unknown = await response.json();
        if (!isBundledSearchIndex(json)) throw new Error("Bundled CSB search index is invalid");
        return json;
      })
      .catch((error) => {
        bundledIndexPromise = null;
        throw error;
      });
  }
  return bundledIndexPromise;
}

export function findBundledVerseMatches(
  rows: BundledSearchRow[],
  query: string,
  limit = 25,
): BibleSearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results: BibleSearchHit[] = [];
  for (const [book, chapter, verse, text] of rows) {
    const haystack = text.toLocaleLowerCase();
    if (!tokens.every((token) => haystack.includes(token))) continue;
    results.push({
      reference: formatVerseReference(book, chapter, verse),
      book,
      chapter,
      verse,
      text: snippetAround(text, tokens),
    });
    if (results.length >= limit) break;
  }
  return results;
}

/** Full-text CSB search using the bundled index; never calls API.Bible. */
export async function searchBundledCsbVerses(
  query: string,
  limit = 25,
  signal?: AbortSignal,
): Promise<BibleSearchHit[]> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const index = await loadBundledCsbSearchIndex();
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return findBundledVerseMatches(index.verses, query, limit);
}
