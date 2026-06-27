import type { CanonicalVerse } from "./types";
import { formatVerseReference } from "./verseId";
import { getCanonicalChapter, listCanonicalChapterKeys } from "./store";
import { CANONICAL_CSB_BIBLE_ID } from "./passageToCanonical";

export type LocalVerseSearchHit = {
  verseId: string;
  reference: string;
  bookAbbr: string;
  chapter: number;
  verse: number;
  text: string;
  snippet: string;
};

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function snippetAround(text: string, tokens: string[], maxLen = 120): string {
  const lower = text.toLowerCase();
  let idx = -1;
  for (const t of tokens) {
    const i = lower.indexOf(t);
    if (i >= 0) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return text.slice(0, maxLen);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, start + maxLen);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function verseMatches(v: CanonicalVerse, tokens: string[]): boolean {
  const hay = v.text.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

export async function searchCanonicalVerses(
  query: string,
  limit = 25,
  bibleId: string = CANONICAL_CSB_BIBLE_ID,
): Promise<LocalVerseSearchHit[]> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const keys = await listCanonicalChapterKeys(bibleId);
  const hits: LocalVerseSearchHit[] = [];

  for (const key of keys) {
    if (hits.length >= limit) break;
    const parts = key.split("|");
    const bookAbbr = parts[1];
    const chapter = Number(parts[2]);
    if (!bookAbbr || !Number.isFinite(chapter)) continue;

    const record = await getCanonicalChapter(bibleId, bookAbbr, chapter);
    if (!record) continue;

    for (const v of record.verses) {
      if (!verseMatches(v, tokens)) continue;
      hits.push({
        verseId: v.verseId,
        reference: formatVerseReference(v.bookAbbr, v.chapter, v.verse),
        bookAbbr: v.bookAbbr,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
        snippet: snippetAround(v.text, tokens),
      });
      if (hits.length >= limit) break;
    }
  }

  return hits;
}

export async function countIndexedVerses(bibleId: string = CANONICAL_CSB_BIBLE_ID): Promise<number> {
  const keys = await listCanonicalChapterKeys(bibleId);
  let total = 0;
  for (const key of keys) {
    const parts = key.split("|");
    const bookAbbr = parts[1];
    const chapter = Number(parts[2]);
    if (!bookAbbr || !Number.isFinite(chapter)) continue;
    const record = await getCanonicalChapter(bibleId, bookAbbr, chapter);
    if (record) total += record.verses.length;
  }
  return total;
}
