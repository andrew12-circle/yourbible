import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
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
    if (!journalVideoDurationNeedsFix(video, durationMs, mimeType)) return;

    fixedRef.current = true;
    setFixing(true);
    const resumeAt = video.currentTime;
    try {
      const blob = await fetch(url).then((r) => {
        if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
        return r.blob();
      });
      const fixed = await fixJournalVideoBlob(blob, durationMs ?? 0);
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
        className="w-full max-h-[min(70vh,480px)] object-contain bg-black"
      />
    </div>
  );
}
