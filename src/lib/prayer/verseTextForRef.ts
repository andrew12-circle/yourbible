import { fetchPassage, type Passage, type PassageVerse } from "@/lib/bible/api";
import { guessBookAbbr, guessChapter, guessVerseEnd, guessVerseStart } from "@/lib/bible/reference";

export function versesForRef(passage: Passage, ref: string): PassageVerse[] {
  const start = guessVerseStart(ref);
  const end = guessVerseEnd(ref) ?? start;
  return passage.verses.filter((v) => v.number >= start && v.number <= end);
}

export function formatVerseText(verses: PassageVerse[]): string {
  return verses.map((v) => v.text).join(" ");
}

export async function fetchVerseTextForRef(bibleId: string, ref: string): Promise<string> {
  const book = guessBookAbbr(ref);
  const chapter = guessChapter(ref);
  const passage = await fetchPassage(bibleId, book, chapter);
  const verses = versesForRef(passage, ref);
  return formatVerseText(verses);
}

/** Batch-load verse text for many refs, fetching each chapter once. */
export async function loadVerseTextsForRefs(
  bibleId: string,
  refs: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const byChapter = new Map<string, { book: string; chapter: number; refs: string[] }>();

  for (const ref of refs) {
    const book = guessBookAbbr(ref);
    const chapter = guessChapter(ref);
    const key = `${book}|${chapter}`;
    const bucket = byChapter.get(key);
    if (bucket) bucket.refs.push(ref);
    else byChapter.set(key, { book, chapter, refs: [ref] });
  }

  await Promise.all(
    [...byChapter.values()].map(async ({ book, chapter, refs: chapterRefs }) => {
      try {
        const passage = await fetchPassage(bibleId, book, chapter);
        for (const ref of chapterRefs) {
          const text = formatVerseText(versesForRef(passage, ref));
          if (text) result.set(ref, text);
        }
      } catch {
        /* skip failed chapters */
      }
    }),
  );

  return result;
}
