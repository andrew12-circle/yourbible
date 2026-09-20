import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { readPlaybackSecondsLocal, writePlaybackSecondsLocal } from "@/lib/framework/artifactPlaybackProgress";
import {
  latestPlaybackSnapshot, readPlaybackSnapshot, writePlaybackSnapshot, type PlaybackSnapshot,
} from "@/lib/framework/playbackSnapshot";

type Pending = PlaybackSnapshot & { userId: string; artifactId: string };
const MAX_WAIT_MS = 5000;

/** Capture the owner with each write. Navigation/sign-out cannot retarget pending progress. */
export function useArtifactPlaybackPersistence(artifactId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;
  const scope = `${userId ?? "anonymous"}:${artifactId ?? ""}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [remote, setRemote] = useState<{ scope: string; snapshot: PlaybackSnapshot | null; done: boolean }>({
    scope, snapshot: null, done: false,
  });
  const pending = useRef<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writing = useRef<Promise<void>>(Promise.resolve());

  const flushToServer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const job = pending.current;
    if (!job) return writing.current;
    pending.current = null;
    writing.current = writing.current.catch(() => {}).then(async () => {
      const { error } = await supabase.from("artifact_playback_progress").upsert({
        user_id: job.userId, artifact_id: job.artifactId, playback_seconds: job.seconds,
        updated_at: new Date(job.updatedAt).toISOString(),
      }, { onConflict: "user_id,artifact_id" });
      if (error) {
        console.warn("[artifactPlaybackProgress] save failed", error.message);
        if (currentScope.current === `${job.userId}:${job.artifactId}` && !pending.current) pending.current = job;
      }
    });
    return writing.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRemote({ scope, snapshot: null, done: !userId || !artifactId });
    if (!userId || !artifactId) return;
    void (async () => {
      const { data, error } = await supabase.from("artifact_playback_progress")
        .select("playback_seconds,updated_at").eq("user_id", userId).eq("artifact_id", artifactId).maybeSingle();
      if (cancelled || currentScope.current !== scope) return;
      const remoteTime = data?.updated_at ? Date.parse(data.updated_at) : NaN;
      const snapshot = !error && data && Number.isFinite(remoteTime) && Number.isFinite(data.playback_seconds)
        ? { seconds: Math.max(0, data.playback_seconds), updatedAt: remoteTime } : null;
      const merged = latestPlaybackSnapshot(readPlaybackSnapshot(userId, artifactId), snapshot);
      if (merged) {
        writePlaybackSnapshot(userId, artifactId, merged);
        writePlaybackSecondsLocal(artifactId, merged.seconds);
      }
      setRemote({ scope, snapshot: merged, done: true });
    })().catch(() => {
      if (!cancelled) setRemote({ scope, snapshot: null, done: true });
    });
    return () => { cancelled = true; void flushToServer(); };
  }, [artifactId, userId, scope, flushToServer]);

  const persistSeconds = useCallback((seconds: number, options?: { intent?: boolean }) => {
    if (!artifactId || !Number.isFinite(seconds) || seconds < 0) return;
    const snapshot = { seconds: Math.floor(seconds), updatedAt: Date.now() };
    if (!options?.intent && userId && (remote.scope !== scope || !remote.done)) return;
    writePlaybackSecondsLocal(artifactId, snapshot.seconds);
    if (!userId) return;
    writePlaybackSnapshot(userId, artifactId, snapshot);
    pending.current = { ...snapshot, userId, artifactId };
    if (!timer.current) timer.current = setTimeout(() => { void flushToServer(); }, MAX_WAIT_MS);
  }, [artifactId, userId, remote.scope, remote.done, scope, flushToServer]);

  useEffect(() => {
    const onHidden = () => { if (document.hidden) void flushToServer(); };
    const onPageHide = () => { void flushToServer(); };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      void flushToServer();
    };
  }, [flushToServer]);

  const local = artifactId && userId ? readPlaybackSnapshot(userId, artifactId) : null;
  const merged = latestPlaybackSnapshot(local, remote.scope === scope ? remote.snapshot : null);
  return {
    resolvedSeconds: merged?.seconds ?? (artifactId ? readPlaybackSecondsLocal(artifactId) ?? 0 : 0),
    loaded: true, persistSeconds, remoteSeconds: remote.scope === scope ? remote.snapshot?.seconds ?? null : null,
    remoteFetchDone: remote.scope === scope && remote.done,
  };
}
