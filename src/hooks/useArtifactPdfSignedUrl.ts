import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VERIFY_TIMEOUT_MS = 15_000;

/** Returns whether the object exists; on network ambiguity, assume ok and let the viewer try. */
async function verifyPdfSignedUrl(signedUrl: string): Promise<"ok" | "missing" | "unknown"> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    const res = await fetch(signedUrl, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      signal: controller.signal,
    });
    if (res.status === 404 || res.status === 400) return "missing";
    if (res.ok || res.status === 206) return "ok";
    return "unknown";
  } catch {
    return "unknown";
  } finally {
    window.clearTimeout(timer);
  }
}

async function resolvePdfSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error: signErr } = await supabase.storage
    .from("artifact-uploads")
    .createSignedUrl(storagePath, 60 * 60);

  if (signErr || !data?.signedUrl) return null;

  const status = await verifyPdfSignedUrl(data.signedUrl);
  if (status === "missing") return null;
  return data.signedUrl;
}

/** Signed URL for stored PDF(s) in artifact-uploads (tries paths in order). */
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
    setLoading(true);
    setError(null);
    setResolvedPath(null);
    setUrl(null);

    void (async () => {
      try {
        for (const path of paths) {
          const signedUrl = await resolvePdfSignedUrl(path);
          if (cancelled) return;
          if (signedUrl) {
            setUrl(signedUrl);
            setResolvedPath(path);
            return;
          }
        }

        if (!cancelled) {
          setError("Could not open the PDF file.");
        }
      } catch {
        if (!cancelled) {
          setError("Could not open the PDF file.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, paths]);

  return { url, error, loading, resolvedPath, hasStoragePath: paths.length > 0 };
}
