import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

async function loadPdfBlobUrl(storagePath: string): Promise<string | null> {
  const { data, error: signErr } = await supabase.storage
    .from("artifact-uploads")
    .createSignedUrl(storagePath, 60 * 60);

  if (signErr || !data?.signedUrl) return null;

  const res = await fetch(data.signedUrl);
  if (!res.ok) return null;

  const blob = new Blob([await res.arrayBuffer()], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

/** Signed blob URL for stored PDF(s) in artifact-uploads (tries paths in order). */
export function useArtifactPdfSignedUrl(
  storagePaths: string | string[] | null | undefined,
  enabled: boolean,
) {
  const paths = useMemo(() => {
    const list = Array.isArray(storagePaths) ? storagePaths : storagePaths ? [storagePaths] : [];
    return [...new Set(list.map((p) => p.trim()).filter(Boolean))];
  }, [storagePaths]);

  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || paths.length === 0) {
      setUrl(null);
      setError(null);
      setLoading(false);
      setResolvedPath(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setResolvedPath(null);

    void (async () => {
      for (const path of paths) {
        try {
          const nextUrl = await loadPdfBlobUrl(path);
          if (cancelled) {
            if (nextUrl) URL.revokeObjectURL(nextUrl);
            return;
          }
          if (nextUrl) {
            objectUrl = nextUrl;
            setUrl(nextUrl);
            setResolvedPath(path);
            setLoading(false);
            return;
          }
        } catch {
          /* try next path */
        }
      }

      if (!cancelled) {
        setUrl(null);
        setError("Could not open the PDF file.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [enabled, paths]);

  return { url, error, loading, resolvedPath, hasStoragePath: paths.length > 0 };
}
