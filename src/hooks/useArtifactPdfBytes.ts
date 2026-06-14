import { useEffect, useMemo, useState } from "react";
import { downloadFirstArtifactUpload } from "@/lib/framework/artifactStorageDownload";

/** Load PDF bytes from artifact-uploads (session + RLS). Tries paths in order. */
export function useArtifactPdfBytes(
  storagePaths: string | string[] | null | undefined,
  enabled: boolean,
) {
  const paths = useMemo(() => {
    const list = Array.isArray(storagePaths) ? storagePaths : storagePaths ? [storagePaths] : [];
    return [...new Set(list.map((p) => p.trim()).filter(Boolean))];
  }, [storagePaths]);

  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || paths.length === 0) {
      if (!enabled) {
        setBytes(null);
        setResolvedPath(null);
        setLoading(false);
        setError(null);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setBytes(null);
    setResolvedPath(null);

    void (async () => {
      try {
        const result = await downloadFirstArtifactUpload(paths);
        if (cancelled) return;
        if (result) {
          setBytes(result.bytes);
          setResolvedPath(result.path);
        } else {
          setError("Could not open the PDF file.");
        }
      } catch {
        if (!cancelled) setError("Could not open the PDF file.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, paths]);

  return { bytes, resolvedPath, loading, error, hasStoragePath: paths.length > 0 };
}
