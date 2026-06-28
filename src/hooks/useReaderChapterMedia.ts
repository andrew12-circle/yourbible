import { useMemo, useState } from "react";
import { chapterContext, hasChapterMedia, inlinePlatesForChapter } from "@/lib/bible/chapterContext";

export function useReaderChapterMedia(bookAbbr: string, chapter: number) {
  const [chapterContextOpen, setChapterContextOpen] = useState(false);
  const inlineChapterPlates = useMemo(
    () => inlinePlatesForChapter(bookAbbr, chapter),
    [bookAbbr, chapter],
  );
  const chapterCtx = useMemo(() => chapterContext(bookAbbr, chapter), [bookAbbr, chapter]);
  const showChapterContext = hasChapterMedia(bookAbbr, chapter);
  const hasInlinePlates = inlineChapterPlates.length > 0;

  return {
    chapterContextOpen,
    setChapterContextOpen,
    chapterCtx,
    showChapterContext,
    hasInlinePlates,
  };
}
