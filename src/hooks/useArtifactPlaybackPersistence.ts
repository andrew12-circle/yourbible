import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchArtifactPlaybackSnapshot, upsertArtifactPlaybackProgress } from "@/lib/framework/artifactPlaybackProgress";
import { mergePlaybackSnapshots, normalizePlaybackSeconds, readPlaybackSnapshot, writePlaybackSnapshot, type PlaybackSnapshot } from "@/lib/framework/playbackSnapshot";

type Session = { artifactId: string; userId?: string; pending: PlaybackSnapshot | null; flushing: boolean; stopped: boolean };
export function useArtifactPlaybackPersistence(artifactId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;
  const ownerKey = `${userId ?? "anonymous"}:${artifactId ?? ""}`;
  const initial = useMemo(() => artifactId ? readPlaybackSnapshot(artifactId, userId) : null, [artifactId, userId]);
  const [remote, setRemote] = useState<{ key: string; snapshot: PlaybackSnapshot | null; done: boolean }>({ key: "", snapshot: null, done: false });
  const sessionRef = useRef<Session | null>(null);
  const currentOwnerRef = useRef(ownerKey);
  currentOwnerRef.current = ownerKey;
  const flush = useCallback(async (session: Session) => {
    if (session.flushing || !session.userId || !session.pending) return;
    session.flushing = true;
    const pending = session.pending;
    session.pending = null;
    try { await upsertArtifactPlaybackProgress(session.userId, session.artifactId, pending.seconds, pending.updatedAt); }
    catch {
      // Keep the newest unsent intent; a network error must not discard a rewind.
      const nextPending = session.pending as PlaybackSnapshot | null;
      if (!nextPending || nextPending.updatedAt < pending.updatedAt) session.pending = pending;
    } finally { session.flushing = false; }
  }, []);
  useEffect(() => {
    if (!artifactId) { setRemote({ key: ownerKey, snapshot: null, done: true }); return; }
    const session: Session = { artifactId, userId, pending: null, flushing: false, stopped: false };
    sessionRef.current = session;
    let cancelled = false;
    setRemote({ key: ownerKey, snapshot: null, done: !userId });
    if (userId) void fetchArtifactPlaybackSnapshot(userId, artifactId).then((snapshot) => {
      if (cancelled || currentOwnerRef.current !== ownerKey) return;
      const merged = mergePlaybackSnapshots(readPlaybackSnapshot(artifactId, userId), snapshot);
      if (merged) writePlaybackSnapshot(artifactId, merged, userId);
      setRemote({ key: ownerKey, snapshot: merged, done: true });
    }).catch(() => {
      if (!cancelled && currentOwnerRef.current === ownerKey) setRemote({ key: ownerKey, snapshot: initial, done: true });
    });
    const tick = setInterval(() => void flush(session), 5000);
    const onHide = () => { if (document.hidden) void flush(session); };
    const onPageHide = () => void flush(session);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("online", onPageHide);
    return () => {
      cancelled = true; session.stopped = true; clearInterval(tick);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("online", onPageHide);
      // Flush with the captured owner, never the next account's mutable user ID.
      void flush(session);
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [artifactId, flush, initial, ownerKey, userId]);
  const persistSeconds = useCallback((seconds: number) => {
    if (!artifactId) return;
    const s = normalizePlaybackSeconds(seconds);
    if (s == null) return;
    if (readPlaybackSnapshot(artifactId, userId)?.seconds === s) return;
    const snapshot = { seconds: s, updatedAt: Date.now() };
    writePlaybackSnapshot(artifactId, snapshot, userId);
    const session = sessionRef.current;
    if (session && !session.stopped && session.artifactId === artifactId && session.userId === userId) session.pending = snapshot;
  }, [artifactId, userId]);
  const local = artifactId ? readPlaybackSnapshot(artifactId, userId) : null;
  const resolved = mergePlaybackSnapshots(local, remote.key === ownerKey ? remote.snapshot : null);
  return { resolvedSeconds: resolved?.seconds ?? 0, localStart: initial?.seconds ?? 0,
    loaded: true, persistSeconds, ownerKey, remoteSeconds: remote.key === ownerKey ? remote.snapshot?.seconds ?? null : null,
    remoteFetchDone: !userId || (remote.key === ownerKey && remote.done) };
}
