import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  estimateJournalVideoDurationMs,
  fixJournalVideoBlob,
  journalVideoDurationNeedsFix,
} from "@/lib/journal/fixJournalVideoBlob";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  durationMs: number | null;
  mimeType?: string | null;
  className?: string;
};

export default function JournalEntryVideoPlayer({ url, durationMs, mimeType, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fixedRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);
  const repairAbortRef = useRef<AbortController | null>(null);
  const repairGenerationRef = useRef(0);
  const [fixing, setFixing] = useState(false);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    repairGenerationRef.current += 1;
    repairAbortRef.current?.abort();
    repairAbortRef.current = null;
    fixedRef.current = false;
    setFixing(false);
    setPortrait(false);
    const video = videoRef.current;
    if (video && video.src !== url) {
      video.src = url;
      video.load();
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, [url]);

  useEffect(() => {
    return () => {
      repairAbortRef.current?.abort();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const repairDurationIfNeeded = useCallback(async () => {
    const video = videoRef.current;
    if (!video || fixedRef.current || !url) return;

    const normalizedMime = mimeType?.toLowerCase() ?? "";
    if (normalizedMime && !normalizedMime.includes("webm")) {
      fixedRef.current = true;
      return;
    }
    if (
      durationMs != null &&
      durationMs > 0 &&
      !journalVideoDurationNeedsFix(video, durationMs, mimeType)
    ) {
      fixedRef.current = true;
      return;
    }

    const generation = repairGenerationRef.current;
    const controller = new AbortController();
    repairAbortRef.current?.abort();
    repairAbortRef.current = controller;
    setFixing(true);
    let blob: Blob;
    try {
      blob = await fetch(url, { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
        return r.blob();
      });
    } catch (e) {
      if (!controller.signal.aborted) {
        console.warn("[journal-video] playback blob fetch failed:", e);
      }
      if (repairGenerationRef.current === generation) {
        repairAbortRef.current = null;
        setFixing(false);
      }
      return;
    }
    if (controller.signal.aborted || repairGenerationRef.current !== generation) return;

    const repairMs =
      durationMs != null && durationMs > 0
        ? durationMs
        : estimateJournalVideoDurationMs(blob.size) ?? 0;
    if (!journalVideoDurationNeedsFix(video, repairMs, mimeType, blob.size)) {
      fixedRef.current = true;
      repairAbortRef.current = null;
      setFixing(false);
      return;
    }

    fixedRef.current = true;
    const resumeAt = video.currentTime;
    try {
      const fixed = await fixJournalVideoBlob(blob, repairMs);
      if (fixed === blob) return;

      const objectUrl = URL.createObjectURL(fixed);
      if (
        controller.signal.aborted ||
        repairGenerationRef.current !== generation ||
        videoRef.current !== video
      ) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = objectUrl;
      video.src = objectUrl;
      video.load();
      if (resumeAt > 0) {
        video.addEventListener(
          "loadedmetadata",
          () => {
            video.currentTime = resumeAt;
          },
          { once: true },
        );
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        console.warn("[journal-video] playback duration repair failed:", e);
      }
    } finally {
      if (repairGenerationRef.current === generation) {
        repairAbortRef.current = null;
        setFixing(false);
      }
    }
  }, [durationMs, mimeType, url]);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) setPortrait(video.videoHeight > video.videoWidth);
    void repairDurationIfNeeded();
  }, [repairDurationIfNeeded]);

  return (
    <div className={cn("relative flex justify-center bg-black", className)}>
      {fixing ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-white"
          aria-live="polite"
        >
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
          <span className="text-sm font-medium">Preparing playback…</span>
        </div>
      ) : null}
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        className={cn(
          "block max-w-full object-contain bg-black",
          portrait
            ? "h-[min(70dvh,720px)] w-auto"
            : "aspect-video max-h-[min(70dvh,720px)] w-full",
        )}
      />
    </div>
  );
}
