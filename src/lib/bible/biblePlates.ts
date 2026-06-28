import { platesBeforeVerse } from "@/lib/bible/chapterContext";

export type { BiblePlate, ChapterContextBundle } from "@/data/biblePlates/types";

export {
  chapterContext,
  hasChapterMedia,
  inlinePlatesForChapter,
  mapsForChapter,
  platesBeforeVerse,
  platesForChapter,
  relatedPassagesForChapter,
  timelineForChapter,
} from "@/lib/bible/chapterContext";

export function openingPlatesForChapter(bookAbbr: string, chapter: number) {
  return platesBeforeVerse(bookAbbr, chapter, 1);
}
