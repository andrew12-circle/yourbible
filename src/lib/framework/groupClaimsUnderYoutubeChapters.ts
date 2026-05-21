import type { TranscriptSegment } from "@/lib/transcriptSplit";
import type { YoutubeChapter } from "@/lib/youtubeChapters";

export type ClaimChapterGroup<T extends { id: string; chapter_start_seconds?: number | null }> = {
  id: string;
  title: string;
  chapterStartSeconds?: number;
  claims: T[];
};

export function groupClaimsUnderYoutubeChapters<
  T extends { id: string; chapter_start_seconds?: number | null },
>(
  claims: T[],
  claimSources: Record<string, TranscriptSegment | null>,
  chapters: YoutubeChapter[],
): { grouped: boolean; groups: ClaimChapterGroup<T>[] } {
  const sorted = [...chapters]
    .filter((c) => Number.isFinite(c.start_seconds))
    .sort((a, b) => a.start_seconds - b.start_seconds);
  if (!sorted.length) {
    return { grouped: false, groups: [{ id: "all", title: "", claims: [...claims] }] };
  }

  const before: T[] = [];
  const perChapter: T[][] = sorted.map(() => []);
  const uncategorized: T[] = [];

  for (const claim of claims) {
    const anchored = claim.chapter_start_seconds;
    if (anchored != null && Number.isFinite(anchored)) {
      if (anchored < sorted[0].start_seconds) {
        before.push(claim);
        continue;
      }
      let idx = 0;
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].start_seconds <= anchored) {
          idx = i;
          break;
        }
      }
      perChapter[idx].push(claim);
      continue;
    }

    const sec = claimSources[claim.id]?.startSeconds;
    if (sec == null || !Number.isFinite(sec)) {
      uncategorized.push(claim);
      continue;
    }
    if (sec < sorted[0].start_seconds) {
      before.push(claim);
      continue;
    }
    let idx = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].start_seconds <= sec) {
        idx = i;
        break;
      }
    }
    perChapter[idx].push(claim);
  }

  const groups: ClaimChapterGroup<T>[] = [];
  if (before.length) {
    groups.push({ id: "before-first", title: "Before first chapter", claims: before });
  }
  sorted.forEach((ch, i) => {
    const list = perChapter[i];
    if (!list.length) return;
    groups.push({
      id: `ch-${ch.start_seconds}-${i}`,
      title: ch.title,
      chapterStartSeconds: ch.start_seconds,
      claims: list,
    });
  });
  if (uncategorized.length) {
    groups.push({ id: "uncategorized", title: "Uncategorized", claims: uncategorized });
  }
  return { grouped: true, groups };
}
