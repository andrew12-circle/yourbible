import { useEffect, useMemo, useState } from "react";
import { chapterContext, hasChapterMedia, inlinePlatesForChapter } from "@/lib/bible/chapterContext";
import { getNextChapterRef, getPrevChapterRef } from "@/lib/bible/chapterNav";
import { preloadBibleArtwork } from "@/lib/bible/preloadBibleArtwork";

export function useReaderChapterMedia(bookAbbr: string, chapter: number) {
  const [chapterContextOpen, setChapterContextOpen] = useState(false);
  const inlineChapterPlates = useMemo(() => inlinePlatesForChapter(bookAbbr, chapter), [bookAbbr, chapter]);
  const chapterCtx = useMemo(() => chapterContext(bookAbbr, chapter), [bookAbbr, chapter]);
  useEffect(() => {
    setChapterContextOpen(false);
    const prev = getPrevChapterRef(bookAbbr, chapter);
    const next = getNextChapterRef(bookAbbr, chapter);
    const near = [...inlineChapterPlates.slice(0, 2), ...(prev ? inlinePlatesForChapter(prev.book.abbr, prev.chapter).slice(-1) : []), ...(next ? inlinePlatesForChapter(next.book.abbr, next.chapter).slice(0, 1) : [])];
    for (const plate of near) void preloadBibleArtwork(plate).catch(() => {});
  }, [bookAbbr, chapter, inlineChapterPlates]);
  return { chapterContextOpen, setChapterContextOpen, chapterCtx, showChapterContext: hasChapterMedia(bookAbbr, chapter), hasInlinePlates: inlineChapterPlates.length > 0, inlineChapterPlates };
}
