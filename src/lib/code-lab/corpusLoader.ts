import { fetchPassageWithCache } from "@/lib/bible/fetchPassageWithCache";
import { isWlcBibleId } from "@/lib/bible/canon";
import { profileForBibleId } from "@/lib/code-lab/textProfiles";
import { buildTextStream } from "@/lib/code-lab/textStream";
import { wlcSegmentsForChapter } from "@/lib/code-lab/wlcLoader";
import { bookOptions, chaptersForScope } from "@/lib/code-lab/scope";
import type { CodeLabScope, TextStream, VerseSegment } from "@/lib/code-lab/types";

export interface CorpusLoadProgress {
  loaded: number;
  total: number;
  current?: string;
}

export interface CorpusLoadOptions {
  bibleId: string;
  languageId?: string;
  scope: CodeLabScope;
  signal?: AbortSignal;
  onProgress?: (p: CorpusLoadProgress) => void;
}

function verseInRange(verse: number, scope: CodeLabScope): boolean {
  if (scope.kind !== "passage") return true;
  if (scope.verseStart != null && verse < scope.verseStart) return false;
  if (scope.verseEnd != null && verse > scope.verseEnd) return false;
  return true;
}

async function loadApiCorpus(
  options: CorpusLoadOptions,
  chapterRefs: { book: string; bookName: string; chapter: number }[],
): Promise<VerseSegment[]> {
  const { bibleId, scope, signal, onProgress } = options;
  const segments: VerseSegment[] = [];
  const total = chapterRefs.length;

  for (let i = 0; i < chapterRefs.length; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const ref = chapterRefs[i]!;
    onProgress?.({
      loaded: i,
      total,
      current: `${ref.bookName} ${ref.chapter}`,
    });

    const passage = await fetchPassageWithCache(bibleId, ref.book, ref.chapter, signal);

    for (const v of passage.verses) {
      if (!verseInRange(v.number, scope)) continue;
      segments.push({
        book: ref.book,
        bookName: ref.bookName,
        chapter: ref.chapter,
        verse: v.number,
        raw: v.text,
      });
    }
  }

  onProgress?.({ loaded: total, total });
  return segments;
}

async function loadWlcCorpus(
  options: CorpusLoadOptions,
  chapterRefs: { book: string; bookName: string; chapter: number }[],
): Promise<VerseSegment[]> {
  const { scope, signal, onProgress } = options;
  const segments: VerseSegment[] = [];
  const total = chapterRefs.length;
  const verseStart = scope.kind === "passage" ? scope.verseStart : undefined;
  const verseEnd = scope.kind === "passage" ? scope.verseEnd : undefined;

  for (let i = 0; i < chapterRefs.length; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const ref = chapterRefs[i]!;
    onProgress?.({
      loaded: i,
      total,
      current: `${ref.bookName} ${ref.chapter}`,
    });

    const part = await wlcSegmentsForChapter(
      ref.book,
      ref.bookName,
      ref.chapter,
      verseStart,
      verseEnd,
      signal,
    );
    segments.push(...part);
  }

  onProgress?.({ loaded: total, total });
  return segments;
}

export async function loadCorpus(options: CorpusLoadOptions): Promise<TextStream> {
  const { bibleId, languageId, scope } = options;
  const profile = profileForBibleId(bibleId, languageId);
  const chapterRefs = chaptersForScope(scope);

  if (scope.kind === "passage" && scope.book && scope.chapter) {
    const bookMeta = bookOptions().find((b) => b.abbr === scope.book);
    chapterRefs.length = 0;
    chapterRefs.push({
      book: scope.book,
      bookName: bookMeta?.name ?? scope.book,
      chapter: scope.chapter,
    });
  }

  const segments = isWlcBibleId(bibleId)
    ? await loadWlcCorpus(options, chapterRefs)
    : await loadApiCorpus(options, chapterRefs);

  return buildTextStream(bibleId, profile, segments);
}

export function estimateLetterCount(scope: CodeLabScope): number {
  const refs = chaptersForScope(scope);
  const avg = scope.kind === "passage" ? 800 : 4200;
  if (scope.kind === "passage" && scope.verseStart && scope.verseEnd) {
    const verses = scope.verseEnd - scope.verseStart + 1;
    return verses * 35;
  }
  return refs.length * avg;
}
