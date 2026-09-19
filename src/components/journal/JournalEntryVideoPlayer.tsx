import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSignedVideoUrl } from "@/lib/journal/videos";
import { estimateJournalVideoDurationMs, fixJournalVideoBlob, journalVideoDurationNeedsFix } from "@/lib/journal/fixJournalVideoBlob";
import { journalVideoSignedUrlNeedsRenewal, snapshotJournalVideoPlayback, restoreJournalVideoPlayback,
  type JournalVideoPlaybackSnapshot } from "@/lib/journal/journalVideoPlayback";
import { cn } from "@/lib/utils";

type Props = { url: string; storagePath?: string; durationMs: number | null; mimeType?: string | null; className?: string };

export default function JournalEntryVideoPlayer({ url, storagePath, durationMs, mimeType, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const remoteUrlRef = useRef(url);
  const appliedUrlRef = useRef("");
  const sourceGenerationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const repairedRef = useRef(false);
  const renewingRef = useRef(false);
  const lastAutomaticRetryRef = useRef(0);
  const pendingPlaybackRef = useRef<JournalVideoPlaybackSnapshot | null>(null);
  const playIntentRef = useRef(false);
  const mountedRef = useRef(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [portrait, setPortrait] = useState(false);

  const replaceSource = useCallback((nextUrl: string, repaired = false) => {
    const video = videoRef.current;
    if (!video || appliedUrlRef.current === nextUrl) return;
    sourceGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    pendingPlaybackRef.current = { ...snapshotJournalVideoPlayback(video), playing: playIntentRef.current || !video.paused };
    repairedRef.current = repaired;
    appliedUrlRef.current = nextUrl;
    video.src = nextUrl;
    video.load();
  }, []);

  useEffect(() => {
    remoteUrlRef.current = url;
    lastAutomaticRetryRef.current = 0;
    setPlaybackError(null);
    const video = videoRef.current;
    // A refreshed row must not interrupt an already playing clip.
    if (video && (!appliedUrlRef.current || video.paused || video.readyState < 2)) replaceSource(url);
  }, [url, replaceSource]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sourceGenerationRef.current += 1;
      abortRef.current?.abort();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const refreshPlayback = useCallback(async (automatic = false) => {
    if (renewingRef.current) return;
    if (!storagePath) { setPlaybackError("This video could not play. Reopen the entry and retry."); return; }
    if (automatic && lastAutomaticRetryRef.current && Date.now() - lastAutomaticRetryRef.current < 30_000) {
      setPlaybackError("This video could not play. Check your connection and retry.");
      return;
    }
    if (automatic) lastAutomaticRetryRef.current = Date.now();
    renewingRef.current = true;
    const generation = sourceGenerationRef.current;
    setBusy("Refreshing playback…");
    setPlaybackError(null);
    try {
      const fresh = await getSignedVideoUrl(storagePath);
      if (!mountedRef.current || sourceGenerationRef.current !== generation) return;
      if (!fresh) throw new Error("A fresh playback link was not available.");
      remoteUrlRef.current = fresh;
      // A same-second signer may return the same URL; explicitly retry its load.
      if (appliedUrlRef.current === fresh) appliedUrlRef.current = "";
      replaceSource(fresh);
    } catch {
      if (mountedRef.current && sourceGenerationRef.current === generation) {
        setPlaybackError("This video could not play. Check your connection and retry.");
      }
    } finally {
      renewingRef.current = false;
      if (mountedRef.current) setBusy(null);
    }
  }, [storagePath, replaceSource]);

  const repairDurationIfNeeded = useCallback(async () => {
    const video = videoRef.current;
    if (!video || repairedRef.current || abortRef.current || renewingRef.current) return;
    const mime = mimeType?.toLowerCase() ?? "";
    if (mime && !mime.includes("webm")) { repairedRef.current = true; return; }
    if (durationMs && !journalVideoDurationNeedsFix(video, durationMs, mimeType)) { repairedRef.current = true; return; }
    const generation = sourceGenerationRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy("Preparing playback…");
    try {
      const response = await fetch(remoteUrlRef.current, { signal: controller.signal });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) void refreshPlayback(true);
        throw new Error("Video data could not be loaded.");
      }
      const blob = await response.blob();
      const repairMs = durationMs && durationMs > 0 ? durationMs : estimateJournalVideoDurationMs(blob.size) ?? 0;
      if (controller.signal.aborted || generation !== sourceGenerationRef.current) return;
      repairedRef.current = true;
      if (!journalVideoDurationNeedsFix(video, repairMs, mimeType, blob.size)) return;
      const fixed = await fixJournalVideoBlob(blob, repairMs);
      if (fixed === blob || controller.signal.aborted || generation !== sourceGenerationRef.current || !mountedRef.current) return;
      const objectUrl = URL.createObjectURL(fixed);
      const oldObjectUrl = objectUrlRef.current;
      objectUrlRef.current = objectUrl;
      // Snapshot at replacement time, so a click/seek while fetching is preserved too.
      replaceSource(objectUrl, true);
      if (oldObjectUrl) URL.revokeObjectURL(oldObjectUrl);
    } catch {
      // Repair is optional; native controls remain usable if the original media plays.
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (mountedRef.current && !renewingRef.current) setBusy(null);
    }
  }, [durationMs, mimeType, refreshPlayback, replaceSource]);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setPortrait(video.videoHeight > video.videoWidth);
    setPlaybackError(null);
    const playback = pendingPlaybackRef.current;
    pendingPlaybackRef.current = null;
    if (playback) restoreJournalVideoPlayback(video, playback);
    void repairDurationIfNeeded();
  }, [repairDurationIfNeeded]);

  const renewIfNeeded = () => {
    if (!appliedUrlRef.current.startsWith("blob:") && journalVideoSignedUrlNeedsRenewal(appliedUrlRef.current)) {
      void refreshPlayback(true);
    }
  };

  return (
    <div className={cn("relative flex justify-center bg-black", className)}>
      {busy ? <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-white" role="status">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /><span className="text-sm">{busy}</span>
      </div> : null}
      {playbackError ? <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 px-4 text-center text-white">
        <p role="alert" className="text-sm">{playbackError}</p>
        <Button type="button" variant="secondary" className="min-h-11 gap-2" onClick={() => void refreshPlayback()}><RotateCw className="h-4 w-4" />Retry playback</Button>
      </div> : null}
      <video ref={videoRef} controls playsInline preload="metadata" onLoadedMetadata={onLoadedMetadata}
        onPlay={() => { playIntentRef.current = true; renewIfNeeded(); }}
        onPause={() => { if (!pendingPlaybackRef.current && !videoRef.current?.error) playIntentRef.current = false; }}
        onEnded={() => { playIntentRef.current = false; }}
        onSeeking={renewIfNeeded} onError={() => void refreshPlayback(true)}
        className={cn("block max-w-full object-contain bg-black", portrait ? "h-[min(70dvh,720px)] w-auto" : "aspect-video max-h-[min(70dvh,720px)] w-full")} />
    </div>
  );
}
