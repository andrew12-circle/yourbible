import type { TextProfile } from "@/lib/code-lab/textProfiles";
import type { LetterIndex, TextStream, VerseSegment } from "@/lib/code-lab/types";

export function buildTextStream(
  bibleId: string,
  profile: TextProfile,
  segments: VerseSegment[],
): TextStream {
  const letters: string[] = [];
  const indexMap: LetterIndex[] = [];

  for (const seg of segments) {
    const normalized = profile.normalizeRaw(seg.raw);
    for (let i = 0; i < normalized.length; i++) {
      letters.push(normalized[i]!);
      indexMap.push({
        streamIndex: letters.length - 1,
        book: seg.book,
        chapter: seg.chapter,
        verse: seg.verse,
        charOffsetInVerse: i,
      });
    }
  }

  return {
    bibleId,
    profileId: profile.id,
    segments,
    letters: letters.join(""),
    indexMap,
  };
}

export function formatLetterRef(map: LetterIndex, bookName?: string): string {
  const book = bookName ?? map.book;
  return `${book} ${map.chapter}:${map.verse}`;
}

export function formatHitReference(
  stream: TextStream,
  start: LetterIndex,
  end: LetterIndex,
  bookNames: Record<string, string>,
): string {
  const startName = bookNames[start.book] ?? start.book;
  const endName = bookNames[end.book] ?? end.book;
  if (start.book === end.book && start.chapter === end.chapter) {
    if (start.verse === end.verse) return `${startName} ${start.chapter}:${start.verse}`;
    return `${startName} ${start.chapter}:${start.verse}–${end.verse}`;
  }
  return `${startName} ${start.chapter}:${start.verse} – ${endName} ${end.chapter}:${end.verse}`;
}
