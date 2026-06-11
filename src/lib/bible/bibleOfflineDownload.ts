import { BOOKS } from "@/data/books";
import { fetchPassage } from "@/lib/bible/api";
import { getCachedPassage, setCachedPassage } from "@/lib/bible/passageCache";

export const LS_OFFLINE_BIBLE_KEY = "yb.offlineBible";

export type OfflineDownloadProgress = {
  bibleId: string;
  total: number;
  done: number;
  status: "idle" | "running" | "done" | "error";
  error?: string;
};

const CHAPTER_REFS = BOOKS.flatMap((b) =>
  Array.from({ length: b.chapters }, (_, i) => ({ book: b.abbr, chapter: i + 1 })),
);

export function totalChapterCount(): number {
  return CHAPTER_REFS.length;
}

export function readOfflineBibleId(): string | null {
  try {
    return localStorage.getItem(LS_OFFLINE_BIBLE_KEY);
  } catch {
    return null;
  }
}

export function writeOfflineBibleId(bibleId: string | null): void {
  try {
    if (bibleId) localStorage.setItem(LS_OFFLINE_BIBLE_KEY, bibleId);
    else localStorage.removeItem(LS_OFFLINE_BIBLE_KEY);
  } catch {
    /* ignore */
  }
}

export async function countCachedChapters(bibleId: string): Promise<number> {
  let n = 0;
  for (const { book, chapter } of CHAPTER_REFS) {
    const row = await getCachedPassage(bibleId, book, chapter);
    if (row?.passage?.verses?.length) n += 1;
  }
  return n;
}

export async function downloadBibleForOffline(
  bibleId: string,
  onProgress?: (p: OfflineDownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const total = CHAPTER_REFS.length;
  let done = 0;

  const report = (status: OfflineDownloadProgress["status"], error?: string) => {
    onProgress?.({ bibleId, total, done, status, error });
  };

  report("running");
  writeOfflineBibleId(bibleId);

  for (const { book, chapter } of CHAPTER_REFS) {
    if (signal?.aborted) throw new Error("Download cancelled");

    const existing = await getCachedPassage(bibleId, book, chapter);
    if (!existing?.passage?.verses?.length) {
      try {
        const passage = await fetchPassage(bibleId, book, chapter, signal);
        await setCachedPassage(bibleId, book, chapter, passage);
      } catch (err) {
        report("error", err instanceof Error ? err.message : "Download failed");
        throw err;
      }
    }
    done += 1;
    report("running");
    await new Promise((r) => setTimeout(r, 40));
  }

  report("done");
}
