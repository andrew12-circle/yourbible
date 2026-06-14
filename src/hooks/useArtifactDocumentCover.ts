import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { downloadArtifactUploadBytes } from "@/lib/framework/artifactStorageDownload";
import { coverStoragePath, documentCoverUrl } from "@/lib/framework/documentArtifact";
import { renderPdfBytesPageToObjectUrl } from "@/lib/framework/renderPdfPageThumbnail";

type Options = {
  artifactId: string;
  metadata: Record<string, unknown> | null | undefined;
  pdfStoragePath: string | null | undefined;
  pdfStoragePaths?: string[];
  enabled?: boolean;
};

const coverRenderCache = new Map<string, string>();
const storedCoverCache = new Map<string, string>();

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

  const [storedCoverUrl, setStoredCoverUrl] = useState<string | null>(() =>
    storedCoverPath ? storedCoverCache.get(storedCoverPath) ?? null : null,
  );
  const [storedCoverLoading, setStoredCoverLoading] = useState(false);
  const [storedCoverRejected, setStoredCoverRejected] = useState(false);

  const hasWorkingStoredCover = Boolean(storedCoverPath && storedCoverUrl && !storedCoverRejected);
  const shouldRenderFromPdf = enabled && !staticUrl && !hasWorkingStoredCover;

  const [renderedUrl, setRenderedUrl] = useState<string | null>(() => coverRenderCache.get(artifactId) ?? null);
  const [renderLoading, setRenderLoading] = useState(false);
  const persistStartedRef = useRef(false);

  useEffect(() => {
    setStoredCoverRejected(false);
  }, [artifactId, storedCoverPath]);

  useEffect(() => {
    if (!enabled || staticUrl || !storedCoverPath || storedCoverRejected) {
      if (!storedCoverPath || storedCoverRejected) {
        setStoredCoverUrl(null);
        setStoredCoverLoading(false);
      }
      return;
    }

    const cached = storedCoverCache.get(storedCoverPath);
    if (cached) {
      setStoredCoverUrl(cached);
      setStoredCoverLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setStoredCoverLoading(true);

    void (async () => {
      try {
        const bytes = await downloadArtifactUploadBytes(storedCoverPath);
        if (cancelled) return;
        if (!bytes) {
          setStoredCoverUrl(null);
          return;
        }
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
        storedCoverCache.set(storedCoverPath, objectUrl);
        setStoredCoverUrl(objectUrl);
      } catch {
        if (!cancelled) setStoredCoverUrl(null);
      } finally {
        if (!cancelled) setStoredCoverLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl && storedCoverCache.get(storedCoverPath) !== objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [enabled, staticUrl, storedCoverPath, storedCoverRejected]);

  useEffect(() => {
    if (!shouldRenderFromPdf) {
      if (!coverRenderCache.get(artifactId)) setRenderedUrl(null);
      setRenderLoading(false);
      return;
    }

    const cached = coverRenderCache.get(artifactId);
    if (cached) {
      setRenderedUrl(cached);
      setRenderLoading(false);
      return;
    }

    if (pdfPaths.length === 0) {
      setRenderedUrl(null);
      setRenderLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setRenderLoading(true);

    void (async () => {
      try {
        for (const path of pdfPaths) {
          const bytes = await downloadArtifactUploadBytes(path);
          if (cancelled) return;
          if (!bytes) continue;

          const url = await renderPdfBytesPageToObjectUrl(bytes, 1);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }

          objectUrl = url;
          coverRenderCache.set(artifactId, url);
          setRenderedUrl(url);
          setRenderLoading(false);

          if (!persistStartedRef.current) {
            persistStartedRef.current = true;
            void persistRenderedCover(artifactId, path, url).catch(() => undefined);
          }
          return;
        }

        if (!cancelled) {
          setRenderedUrl(null);
          setRenderLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRenderedUrl(null);
          setRenderLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl && coverRenderCache.get(artifactId) !== objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [artifactId, pdfPaths, shouldRenderFromPdf]);

  const coverUrl = staticUrl ?? (hasWorkingStoredCover ? storedCoverUrl : null) ?? renderedUrl;
  const fromPdf = Boolean(coverUrl && !staticUrl);
  const coverSource = staticUrl ? "external" : hasWorkingStoredCover ? "stored" : renderedUrl ? "rendered" : null;

  const onCoverImageError = () => {
    if (coverSource === "stored") setStoredCoverRejected(true);
  };

  const coverLoading =
    (storedCoverPath && storedCoverLoading && !storedCoverRejected) ||
    (renderLoading && !coverUrl);

  return { coverUrl, loading: coverLoading, fromPdf, onCoverImageError };
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
