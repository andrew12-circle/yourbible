import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchArtifactPlaybackProgress,
  mergePlaybackSeconds,
  readPlaybackSecondsLocal,
  upsertArtifactPlaybackProgress,
  writePlaybackSecondsLocal,
} from "@/lib/framework/artifactPlaybackProgress";

const PERSIST_DEBOUNCE_MS = 2000;

/**
 * Account-backed watch progress (YouTube-style): loads on sign-in, debounced upsert while watching.
 * Session storage remains a fast local cache for the current tab.
 */
export function useArtifactPlaybackPersistence(artifactId: string | undefined) {
  const { user } = useAuth();
  const [remoteSeconds, setRemoteSeconds] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pendingSecondsRef = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const resolvedSeconds = artifactId
    ? mergePlaybackSeconds(readPlaybackSecondsLocal(artifactId), remoteSeconds)
    : 0;

  useEffect(() => {
    if (!artifactId) {
      setRemoteSeconds(null);
      setLoaded(true);
      return;
    }

    if (!user?.id) {
      setRemoteSeconds(null);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);

    void (async () => {
      const remote = await fetchArtifactPlaybackProgress(user.id, artifactId);
      if (cancelled) return;
      setRemoteSeconds(remote);
      const merged = mergePlaybackSeconds(readPlaybackSecondsLocal(artifactId), remote);
      if (merged > 0) writePlaybackSecondsLocal(artifactId, merged);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [artifactId, user?.id]);

  const flushToServer = useCallback(async () => {
    const uid = userIdRef.current;
    if (!artifactId || !uid) return;
    const pending = pendingSecondsRef.current;
    if (pending == null) return;
    pendingSecondsRef.current = null;
    await upsertArtifactPlaybackProgress(uid, artifactId, pending);
  }, [artifactId]);

  const persistSeconds = useCallback(
    (seconds: number) => {
      if (!artifactId) return;
      const s = Math.max(0, Math.floor(seconds));
      writePlaybackSecondsLocal(artifactId, s);
      setRemoteSeconds((prev) => (prev == null || s > prev ? s : prev));

      const uid = userIdRef.current;
      if (!uid) return;

      pendingSecondsRef.current = s;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void flushToServer();
      }, PERSIST_DEBOUNCE_MS);
    },
    [artifactId, flushToServer],
  );

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) void flushToServer();
    };
    const onPageHide = () => void flushToServer();
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void flushToServer();
    };
  }, [flushToServer]);

  return { resolvedSeconds, loaded, persistSeconds, remoteSeconds };
}
