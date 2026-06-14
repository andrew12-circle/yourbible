import { useCallback, useEffect, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfJs } from "@/lib/framework/pdfJsLoader";

export function useArtifactPdfDocument(pdfUrl: string | null, enabled: boolean) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !pdfUrl) {
      setDoc(null);
      setNumPages(0);
      setPage(1);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let activeDoc: PDFDocumentProxy | null = null;
    setLoading(true);
    setError(null);
    setDoc(null);
    setNumPages(0);
    setPage(1);

    void (async () => {
      try {
        const pdfjs = await loadPdfJs();
        if (cancelled) return;
        const nextDoc = await pdfjs.getDocument({ url: pdfUrl, withCredentials: false }).promise;
        if (cancelled) {
          void nextDoc.destroy();
          return;
        }
        activeDoc = nextDoc;
        setDoc(nextDoc);
        setNumPages(nextDoc.numPages);
        setPage(1);
      } catch {
        if (!cancelled) {
          setError("Could not load this PDF.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (activeDoc) void activeDoc.destroy();
    };
  }, [enabled, pdfUrl]);

  const goPrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setPage((p) => (numPages > 0 ? Math.min(numPages, p + 1) : p));
  }, [numPages]);

  return { doc, numPages, page, setPage, goPrev, goNext, loading, error };
}
