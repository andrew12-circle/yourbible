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
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    fixedRef.current = false;
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
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const repairDurationIfNeeded = useCallback(async () => {
    const video = videoRef.current;
    if (!video || fixedRef.current || !url) return;

    let blob: Blob;
    try {
      blob = await fetch(url).then((r) => {
        if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
        return r.blob();
      });
    } catch (e) {
      console.warn("[journal-video] playback blob fetch failed:", e);
      return;
    }

    const repairMs =
      durationMs != null && durationMs > 0
        ? durationMs
        : estimateJournalVideoDurationMs(blob.size) ?? 0;
    if (!journalVideoDurationNeedsFix(video, repairMs, mimeType, blob.size)) return;

    fixedRef.current = true;
    setFixing(true);
    const resumeAt = video.currentTime;
    try {
      const fixed = await fixJournalVideoBlob(blob, repairMs);
      if (fixed === blob) return;

      const objectUrl = URL.createObjectURL(fixed);
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
      console.warn("[journal-video] playback duration repair failed:", e);
    } finally {
      setFixing(false);
    }
  }, [durationMs, mimeType, url]);

  const onLoadedMetadata = useCallback(() => {
    void repairDurationIfNeeded();
  }, [repairDurationIfNeeded]);

  return (
    <div className={cn("relative", className)}>
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
        className="aspect-video w-full max-h-[min(70vh,720px)] object-contain bg-black"
      />
    </div>
  );
}
