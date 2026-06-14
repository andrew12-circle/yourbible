import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PageFlip } from "@/components/bible/PageFlip";
import { Button } from "@/components/ui/button";
import { useArtifactPdfDocument } from "@/hooks/useArtifactPdfDocument";
import { cn } from "@/lib/utils";

type Props = {
  pdfBytes: Uint8Array | null;
  title: string;
  className?: string;
};

export default function ArtifactPdfPageViewer({ pdfBytes, title, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [turnDirection, setTurnDirection] = useState<"forward" | "back">("forward");
  const { doc, numPages, page, setPage, goPrev, goNext, loading, error } = useArtifactPdfDocument(pdfBytes, true);

  const renderCurrentPage = useCallback(async () => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!doc || !container || !canvas) return;

    setRendering(true);
    setRenderError(null);
    try {
      const pdfPage = await doc.getPage(page);
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const padding = 24;
      const maxW = Math.max(120, container.clientWidth - padding);
      const maxH = Math.max(160, container.clientHeight - padding);
      const fitScale = Math.min(maxW / baseViewport.width, maxH / baseViewport.height);
      const dpr = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale: fitScale * dpr });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable.");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
    } catch {
      setRenderError("Could not render this page.");
    } finally {
      setRendering(false);
    }
  }, [doc, page]);

  useEffect(() => {
    void renderCurrentPage();
  }, [renderCurrentPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      void renderCurrentPage();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [renderCurrentPage]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setTurnDirection("back");
        goPrev();
      } else if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        setTurnDirection("forward");
        goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  const showLoading = loading || (doc != null && rendering && !renderError);
  const fatalError = error ?? renderError;

  const handlePrev = () => {
    setTurnDirection("back");
    goPrev();
  };

  const handleNext = () => {
    setTurnDirection("forward");
    goNext();
  };

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col bg-[#1c1c1e]", className)}>
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        {fatalError ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/70">
            {fatalError}
          </div>
        ) : (
          <PageFlip pageKey={`${page}`} direction={turnDirection} enableSlide>
            <div className="flex h-full w-full items-center justify-center p-3 sm:p-5">
              <canvas
                ref={canvasRef}
                className="max-h-full max-w-full rounded-sm bg-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                aria-label={`${title}, page ${page}${numPages > 0 ? ` of ${numPages}` : ""}`}
              />
            </div>
          </PageFlip>
        )}

        {!fatalError && page > 1 ? (
          <button
            type="button"
            className="absolute inset-y-0 left-0 z-10 w-[min(28%,120px)] cursor-w-resize bg-gradient-to-r from-black/20 to-transparent opacity-0 transition hover:opacity-100 focus-visible:opacity-100"
            onClick={handlePrev}
            aria-label="Previous page"
          />
        ) : null}
        {!fatalError && numPages > 0 && page < numPages ? (
          <button
            type="button"
            className="absolute inset-y-0 right-0 z-10 w-[min(28%,120px)] cursor-e-resize bg-gradient-to-l from-black/20 to-transparent opacity-0 transition hover:opacity-100 focus-visible:opacity-100"
            onClick={handleNext}
            aria-label="Next page"
          />
        ) : null}

        {showLoading ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1c1c1e]/80 text-sm text-white/80">
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
            {loading ? "Opening book…" : "Turning page…"}
          </div>
        ) : null}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-3 py-2.5 sm:px-4">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-white/90 hover:bg-white/10 hover:text-white"
          onClick={handlePrev}
          disabled={page <= 1 || loading}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          {numPages > 1 ? (
            <input
              type="range"
              min={1}
              max={numPages}
              value={page}
              onChange={(event) => {
                setTurnDirection(Number(event.target.value) >= page ? "forward" : "back");
                setPage(Number(event.target.value));
              }}
              className="h-1 w-full max-w-xs cursor-pointer accent-white/90"
              aria-label="Page scrubber"
            />
          ) : null}
          <p className="text-xs tabular-nums text-white/70">
            {numPages > 0 ? `Page ${page} of ${numPages}` : `Page ${page}`}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-white/90 hover:bg-white/10 hover:text-white"
          onClick={handleNext}
          disabled={numPages <= 0 || page >= numPages || loading}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </footer>
    </div>
  );
}
