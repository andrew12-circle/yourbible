import { fetchPassage, type Passage } from "@/lib/bible/api";
import { adjacentChapterRefs } from "@/lib/bible/adjacentChapters";
import { getCachedPassage, setCachedPassage } from "@/lib/bible/passageCache";
import { queryClient } from "@/lib/queryClient";
import { passageQueryKey } from "@/hooks/usePassage";

async function prefetchChapter(
  bibleId: string,
  book: string,
  chapter: number,
  bibleAbbr?: string,
): Promise<void> {
  const key = passageQueryKey(bibleId, book, chapter);
  if (queryClient.getQueryData(key)) return;

  const cached = await getCachedPassage(bibleId, book, chapter);
  if (cached) {
    queryClient.setQueryData(key, cached.passage);
    return;
  }

  try {
    const passage = await fetchPassage(bibleId, book, chapter, undefined, bibleAbbr);
    await setCachedPassage(bibleId, book, chapter, passage);
    queryClient.setQueryData(key, passage);
  } catch {
    /* best-effort prefetch */
  }
}

export async function fetchPassageWithCache(
  bibleId: string,
  book: string,
  chapter: number,
  signal?: AbortSignal,
  bibleAbbr?: string,
): Promise<Passage> {
  const cached = await getCachedPassage(bibleId, book, chapter);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    if (cached) return cached.passage;
    throw new Error("You are offline and this chapter is not saved yet.");
  }

  try {
    const passage = await fetchPassage(bibleId, book, chapter, signal, bibleAbbr);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await setCachedPassage(bibleId, book, chapter, passage);

    for (const ref of adjacentChapterRefs(book, chapter)) {
      void prefetchChapter(bibleId, ref.book, ref.chapter, bibleAbbr);
    }

    return passage;
  } catch (err) {
    if (cached) return cached.passage;
    throw err;
  }
}

export async function hydratePassageFromCache(
  bibleId: string,
  book: string,
  chapter: number,
): Promise<Passage | undefined> {
  const cached = await getCachedPassage(bibleId, book, chapter);
  if (!cached) return undefined;
  queryClient.setQueryData(passageQueryKey(bibleId, book, chapter), cached.passage);
  return cached.passage;
}
