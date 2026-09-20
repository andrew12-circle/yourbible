import { lazy, Suspense } from "react";
const VisualBibleLibrary = lazy(() => import("./visual/VisualBibleLibrary").then((module) => ({ default: module.VisualBibleLibrary })));

/** Keep the established back-matter route while replacing the unbounded image grid. */
export function ArtworkGallery() {
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">Opening visual library…</p>}>
    <VisualBibleLibrary />
  </Suspense>;
}
