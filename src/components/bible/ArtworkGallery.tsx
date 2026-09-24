import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { BOOKS } from "@/data/books";
const VisualBibleLibrary = lazy(() => import("./visual/VisualBibleLibrary").then(module => ({ default: module.VisualBibleLibrary })));

export function ArtworkGallery() {
  const [params] = useSearchParams();
  const book = BOOKS.find(item => item.abbr === params.get("book"));
  const chapter = Number(params.get("chapter"));
  const valid = book && Number.isInteger(chapter) && chapter >= 1 && chapter <= book.chapters;
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">Opening visual library…</p>}>
    <VisualBibleLibrary book={valid ? book.abbr : undefined} chapter={valid ? chapter : undefined} />
  </Suspense>;
}
