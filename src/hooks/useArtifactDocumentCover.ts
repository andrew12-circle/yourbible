import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useArtifactPdfSignedUrl } from "@/hooks/useArtifactPdfSignedUrl";
import { coverStoragePath, documentCoverUrl } from "@/lib/framework/documentArtifact";
import { renderPdfPageToObjectUrl } from "@/lib/framework/renderPdfPageThumbnail";

type Options = {
  artifactId: string;
  metadata: Record<string, unknown> | null | undefined;
  pdfStoragePath: string | null | undefined;
  pdfStoragePaths?: string[];
  enabled?: boolean;
};

const coverRenderCache = new Map<string, string>();

/**
 * Resolves a document cover: stored thumbnail URL, persisted JPEG from page 1,
 * or a one-time render from the source PDF (then cached in storage).
 */
export function useArtifactDocumentCover({
  artifactId,
  metadata,
  pdfStoragePath,
  pdfStoragePaths = [],
  enabled = true,
}: Options) {
  const staticUrl = documentCoverUrl(metadata);
  const storedCoverPath = coverStoragePath(metadata);
  const pdfPaths =
    pdfStoragePaths.length > 0
      ? pdfStoragePaths
      : pdfStoragePath
        ? [pdfStoragePath]
        : [];
  const { url: pdfUrl } = useArtifactPdfSignedUrl(pdfPaths, enabled && !staticUrl && !storedCoverPath);
  const { url: storedCoverUrl } = useArtifactPdfSignedUrl(storedCoverPath, enabled && !staticUrl && Boolean(storedCoverPath));

  const [renderedUrl, setRenderedUrl] = useState<string | null>(() => coverRenderCache.get(artifactId) ?? null);
  const [loading, setLoading] = useState(false);
  const persistStartedRef = useRef(false);

  useEffect(() => {
    if (!enabled || staticUrl || storedCoverUrl) {
      setRenderedUrl(null);
      setLoading(false);
      return;
    }

    const cached = coverRenderCache.get(artifactId);
    if (cached) {
      setRenderedUrl(cached);
      setLoading(false);
      return;
    }

    if (!pdfUrl) return;

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);

    void renderPdfPageToObjectUrl(pdfUrl, 1)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        coverRenderCache.set(artifactId, url);
        setRenderedUrl(url);
        setLoading(false);

        if (persistStartedRef.current || pdfPaths.length === 0) return;
        persistStartedRef.current = true;
        const pathForPersist = pdfPaths[0]!;
        void persistRenderedCover(artifactId, pathForPersist, url).catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled) {
          setRenderedUrl(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl && coverRenderCache.get(artifactId) !== objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [artifactId, enabled, pdfPaths, pdfUrl, staticUrl, storedCoverUrl]);

  const coverUrl = staticUrl ?? storedCoverUrl ?? renderedUrl;
  const fromPdf = Boolean(coverUrl && !staticUrl);

  return { coverUrl, loading: loading && !coverUrl, fromPdf };
}

async function persistRenderedCover(artifactId: string, pdfStoragePath: string, objectUrl: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;

  const folder = pdfStoragePath.split("/")[0];
  if (folder !== userId) return;

  const coverPath = `${userId}/artifacts/${artifactId}-cover.jpg`;
  const res = await fetch(objectUrl);
  const blob = await res.blob();

  const { error: uploadErr } = await supabase.storage.from("artifact-uploads").upload(coverPath, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (uploadErr) return;

  const { data: row } = await supabase.from("artifacts").select("metadata").eq("id", artifactId).maybeSingle();
  const prev = (row?.metadata as Record<string, unknown> | null) ?? {};
  if (prev.cover_storage_path === coverPath) return;

  await supabase
    .from("artifacts")
    .update({ metadata: { ...prev, cover_storage_path: coverPath } })
    .eq("id", artifactId);
}
