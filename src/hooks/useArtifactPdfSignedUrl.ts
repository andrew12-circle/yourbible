import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_TTL_MS = 60 * 60 * 1000;
const CACHE_REFRESH_BUFFER_MS = 5 * 60 * 1000;

type CachedSignedUrl = { url: string; expiresAt: number };

const signedUrlCache = new Map<string, CachedSignedUrl>();

async function resolvePdfSignedUrl(storagePath: string): Promise<string | null> {
  const cached = signedUrlCache.get(storagePath);
  if (cached && Date.now() < cached.expiresAt - CACHE_REFRESH_BUFFER_MS) {
    return cached.url;
  }

  const { data, error: signErr } = await supabase.storage
    .from("artifact-uploads")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_MS / 1000);

  if (signErr || !data?.signedUrl) return null;

  signedUrlCache.set(storagePath, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_MS,
  });
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

  const [url, setUrl] = useState<string | null>(() => {
    for (const path of paths) {
      const cached = signedUrlCache.get(path);
      if (cached && Date.now() < cached.expiresAt - CACHE_REFRESH_BUFFER_MS) {
        return cached.url;
      }
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || paths.length === 0) {
      if (!enabled) {
        setUrl(null);
        setError(null);
        setLoading(false);
        setResolvedPath(null);
      }
      return;
    }

    for (const path of paths) {
      const cached = signedUrlCache.get(path);
      if (cached && Date.now() < cached.expiresAt - CACHE_REFRESH_BUFFER_MS) {
        setUrl(cached.url);
        setResolvedPath(path);
        setError(null);
        setLoading(false);
        return;
      }
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
